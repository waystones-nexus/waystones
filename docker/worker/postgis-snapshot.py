#!/usr/bin/env python3
"""
postgis-snapshot.py — PostGIS → FlatGeobuf + GeoParquet snapshot worker.

Accepts both S3 and local-filesystem output:

  --output-prefix s3://bucket/prefix  OR  /data/

When --output-prefix starts with s3://, files are uploaded via `aws s3 sync`
and a manifest is written to S3.  Otherwise files are copied directly to the
local directory and a manifest is written there.

Input (PostGIS) is always read from environment variables:
    PG_HOST, PG_PORT, PG_DB, PG_USER, PG_PASSWORD
    TABLES      comma-separated "schema.table" values (optional — auto-discovers if unset)
    TARGET_CRS  optional target CRS (e.g. "EPSG:4326")

Required additionally for S3 output:
    AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION
    S3_ENDPOINT, R2_BUCKET
"""

import argparse
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(description="Snapshot PostGIS tables to per-layer FlatGeobuf + GeoParquet files")
    p.add_argument("--output-prefix", required=True, help="Output destination: local dir or s3:// prefix")
    p.add_argument("--user-id",       required=True, help="User ID (for logging)")
    p.add_argument("--model",         required=False, default=None, help="Path to model.json for layer mapping")
    return p.parse_args()

# ---------------------------------------------------------------------------
# DNS Fix (IPv6 TCP Blackhole) — only needed when talking to S3
# ---------------------------------------------------------------------------

def force_ipv4_for_endpoint(endpoint_url: str):
    domain = urlparse(endpoint_url).hostname
    if not domain:
        return
    try:
        # socket.gethostbyname explicitly requests an IPv4 address (A record)
        ipv4_addr = socket.gethostbyname(domain)
        with open("/etc/hosts", "a") as f:
            f.write(f"\n{ipv4_addr} {domain}\n")
        print(f"[snapshot] Fixed IPv6 timeout: Forced {domain} to {ipv4_addr} in /etc/hosts", flush=True)
    except Exception as e:
        print(f"[snapshot] Warning: Could not override DNS for IPv4: {e}", flush=True)

# ---------------------------------------------------------------------------
# S3 helpers
# ---------------------------------------------------------------------------

def get_endpoint_url() -> str:
    url = (
        os.environ.get("AWS_ENDPOINT_URL") or 
        os.environ.get("S3_ENDPOINT", "")
    )
    if not url:
        raise RuntimeError("Neither AWS_ENDPOINT_URL nor S3_ENDPOINT environment variable is set")
    return url

def s3_cp(src: str, dst: str) -> None:
    cmd = ["aws", "s3", "cp", src, dst, "--endpoint-url", get_endpoint_url(), "--no-progress"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"aws s3 cp failed: {result.stderr.strip()}")

def s3_put_json(bucket: str, key: str, data: dict) -> None:
    with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
        json.dump(data, f)
        tmp_path = f.name
    try:
        s3_cp(tmp_path, f"s3://{bucket}/{key}")
    finally:
        os.unlink(tmp_path)

# ---------------------------------------------------------------------------
# Name sanitization — MUST match TypeScript toTableName() in nameSanitizer.ts
# ---------------------------------------------------------------------------

def to_safe_name(name: str) -> str:
    safe = re.sub(r"[^a-z0-9]", "_", name.lower())
    safe = re.sub(r"_+", "_", safe)
    safe = safe.strip("_")
    return safe or "layer"

# ---------------------------------------------------------------------------
# PostGIS helpers
# ---------------------------------------------------------------------------

def get_layer_catalog(pg_conn: str) -> dict:
    """Scan all layers in the database (auto-discovery fallback when TABLES is unset)."""
    print("[snapshot] Scanning database for layers...", flush=True)
    cmd = ["ogrinfo", "-ro", "-al", "-so", pg_conn]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    except subprocess.TimeoutExpired:
        print("[snapshot] Warning: Full database scan timed out.", flush=True)
        return {}
    if result.returncode != 0:
        print(f"[snapshot] Warning: Global ogrinfo scan failed: {result.stderr.strip()}", flush=True)
        return {}

    catalog = {}
    current_layer = None
    for line in result.stdout.splitlines():
        m_start = re.match(r"^Layer name:\s*(.*)$", line, re.IGNORECASE)
        if m_start:
            current_layer = m_start.group(1).strip()
            catalog[current_layer] = {"geom_col": "geom", "full_name": current_layer}
            continue
        if current_layer:
            m_geom = re.search(r"Geometry Column\s*=\s*(\w+)", line, re.IGNORECASE)
            if m_geom:
                catalog[current_layer]["geom_col"] = m_geom.group(1)

    print(f"[snapshot] Discovered {len(catalog)} layer(s) in database.", flush=True)
    return catalog

def get_table_geom_col(pg_conn: str, table_name: str, default: str = "geom") -> str:
    """Query a single table via ogrinfo to find its geometry column name."""
    cmd = ["ogrinfo", "-ro", "-so", pg_conn, table_name]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=20)
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                m = re.search(r"Geometry Column\s*=\s*(\w+)", line, re.IGNORECASE)
                if m:
                    return m.group(1)
    except subprocess.TimeoutExpired:
        print(f"[snapshot] Warning: ogrinfo timed out for '{table_name}' — using '{default}'", flush=True)
    return default

def build_pg_connection_string() -> str:
    host     = os.environ["PG_HOST"]
    port     = os.environ.get("PG_PORT", "5432")
    dbname   = os.environ["PG_DB"]
    user     = os.environ["PG_USER"]
    password = os.environ["PG_PASSWORD"]
    return f"PG:host={host} port={port} dbname={dbname} user={user} password={password}"

def build_pg_uri() -> str:
    host     = os.environ["PG_HOST"]
    port     = os.environ.get("PG_PORT", "5432")
    dbname   = os.environ["PG_DB"]
    user     = os.environ["PG_USER"]
    password = os.environ["PG_PASSWORD"]
    # postgres://[user[:password]@][netloc][:port][/dbname][?param1=value1&...]
    return f"postgresql://{user}:{password}@{host}:{port}/{dbname}"

def snapshot_table(pg_conn: str, full_name: str, geom_col: str, safe_name: str, out_dir: str, target_crs: str = None) -> str:
    """Export a PostGIS table to FlatGeobuf. Returns local .fgb path."""
    out_path = os.path.join(out_dir, f"{safe_name}.fgb")

    if "." in full_name:
        s, t = full_name.rsplit(".", 1)
        quoted_name = f'"{s}"."{t}"'
    else:
        quoted_name = f'"{full_name}"'

    cmd = [
        "ogr2ogr",
        "-f", "FlatGeobuf",
        out_path,
        pg_conn,
        "-sql", f"SELECT * FROM {quoted_name} WHERE {geom_col} IS NOT NULL",
        "-nln", safe_name,
        "-nlt", "PROMOTE_TO_MULTI",
        "-skipfailures",
    ]
    if target_crs:
        cmd += ["-t_srs", target_crs]

    env = os.environ.copy()
    env["OGR_FGB_ALLOW_NULL_GEOMETRIES"] = "YES"

    result = subprocess.run(cmd, capture_output=True, text=True, env=env)
    if result.returncode != 0:
        if target_crs and "coordinate system" in result.stderr:
            print(f"[snapshot] Warning: '{full_name}' has no SRID — assigning {target_crs} from model", flush=True)
            cmd_assign = [c for c in cmd if c not in ("-t_srs", target_crs)] + ["-a_srs", target_crs]
            result = subprocess.run(cmd_assign, capture_output=True, text=True, env=env)
        if result.returncode != 0:
            raise RuntimeError(f"ogr2ogr failed for '{full_name}': {result.stderr.strip()}")
    return out_path

# ---------------------------------------------------------------------------
# Parquet conversion (reads from reprojected FGB — no S3 logic here)
# ---------------------------------------------------------------------------

def convert_to_parquet(fgb_path: str, safe_name: str, out_dir: str) -> None:
    """Convert FlatGeobuf to GeoParquet via DuckDB spatial."""
    import duckdb
    out_path = os.path.join(out_dir, f"{safe_name}.parquet")
    try:
        ext_dir = os.environ.get("DUCKDB_EXTENSION_DIRECTORY", "/duckdb-extensions")
        conn = duckdb.connect(":memory:")
        conn.execute(f"SET extension_directory='{ext_dir}'")
        conn.execute("LOAD spatial")

        # Read directly from the newly reprojected FGB file
        source_query = f"st_read('{fgb_path}')"

        # Introspect schema to find geometry and existing identifiers
        schema = conn.execute(f"DESCRIBE SELECT * FROM {source_query} LIMIT 0").fetchall()
        col_names = [r[0].lower() for r in schema]

        # Find geometry column dynamically
        geom_col = next((r[0] for r in schema if r[1].upper() in ["GEOMETRY", "POINT", "MULTIPOINT", "LINESTRING", "MULTILINESTRING", "POLYGON", "MULTIPOLYGON", "GEOMETRYCOLLECTION"]), "geom")

        bbox_cols = (
            f', ST_XMin("{geom_col}") AS bbox_xmin'
            f', ST_YMin("{geom_col}") AS bbox_ymin'
            f', ST_XMax("{geom_col}") AS bbox_xmax'
            f', ST_YMax("{geom_col}") AS bbox_ymax'
        )

        # Standardize FID: rename or generate if missing
        if "fid" in col_names:
            select = f"*{bbox_cols}"
        elif "ogc_fid" in col_names:
            other = ", ".join(f'"{r[0]}"' for r in schema if r[0].lower() != "ogc_fid")
            select = f'"{geom_col}", ogc_fid AS fid, {other}{bbox_cols}'
        elif "rowid" in col_names:
             other = ", ".join(f'"{r[0]}"' for r in schema if r[0].lower() != "rowid")
             select = f'"{geom_col}", rowid AS fid, {other}{bbox_cols}'
        else:
            select = f"row_number() OVER () AS fid, *{bbox_cols}"

        conn.execute(f"""
            COPY (SELECT {select} FROM {source_query})
            TO '{out_path}'
            (FORMAT PARQUET, CODEC 'snappy', ROW_GROUP_SIZE 1000)
        """)
    except Exception as e:
        print(f"[snapshot] Warning: GeoParquet conversion failed for '{safe_name}': {e}", flush=True)

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    args = parse_args()

    output_prefix = args.output_prefix
    is_s3_output  = output_prefix.startswith("s3://")

    if is_s3_output:
        try:
            force_ipv4_for_endpoint(get_endpoint_url())
        except Exception as e:
            print(f"[snapshot] Warning: Failed DNS override: {e}", flush=True)

    bucket = os.environ.get("S3_BUCKET_NAME") or os.environ.get("R2_BUCKET", "")
    if is_s3_output and not bucket:
        raise RuntimeError("Neither S3_BUCKET_NAME nor R2_BUCKET environment variable is set")

    target_crs = os.environ.get("TARGET_CRS") or None
    pg_conn    = build_pg_connection_string()
    pg_uri     = build_pg_uri()

    tables_raw = os.environ.get("TABLES", "").strip()
    tables_to_process = []

    if not tables_raw:
        # Default mapping logic
        catalog = get_layer_catalog(pg_conn)
        
        # Mapping: [ (full_name, geom_col, safe_name) ]
        if args.model and os.path.exists(args.model):
            print(f"[snapshot] Loading model from {args.model} for layer mapping...", flush=True)
            try:
                with open(args.model, "r") as f:
                    model = json.load(f)
                
                layers = model.get("layers", [])
                mappings_cfg = model.get("sourceConnection", {}).get("layerMappings", {})
                
                for layer in layers:
                    l_id   = layer.get("id")
                    target = layer.get("name")
                    m_info = mappings_cfg.get(l_id)
                    source = m_info.get("sourceTable") if m_info else None
                    
                    if source and source in catalog:
                        # Use target name from model exactly as provided
                        tables_to_process.append((source, catalog[source]["geom_col"], target.lower()))
                        print(f"[snapshot] Map (Model): {source} → {target.lower()}.parquet", flush=True)
            except Exception as e:
                print(f"[snapshot] Warning: Failed to parse model.json: {e}", flush=True)

        if not tables_to_process:
            print("[snapshot] TABLES not set — snapshotting all discovered layers...", flush=True)
            for layer_name in catalog:
                tables_to_process.append((layer_name, catalog[layer_name]["geom_col"], to_safe_name(layer_name)))
    else:
        requested = [t.strip() for t in tables_raw.split(",") if t.strip()]
        for req in requested:
            full_name  = req
            table_only = req.rsplit(".", 1)[-1] if "." in req else req
            geom_col   = get_table_geom_col(pg_conn, req)
            
            # Use model to find the safe name if possible
            safe_name = to_safe_name(table_only)
            if args.model and os.path.exists(args.model):
                try:
                    with open(args.model, "r") as f:
                        model = json.load(f)
                    layers = model.get("layers", [])
                    mappings_cfg = model.get("sourceConnection", {}).get("layerMappings", {})
                    for l in layers:
                        m = mappings_cfg.get(l.get("id"))
                        if m and m.get("sourceTable") == full_name:
                            # Use target name from model exactly as provided
                            safe_name = l.get("name").lower()
                            break
                except: pass

            tables_to_process.append((full_name, geom_col, safe_name))

    if not tables_to_process:
        raise RuntimeError("No valid tables found to process.")

    print(f"[snapshot] Starting snapshot of {len(tables_to_process)} table(s): {', '.join(t[0] for t in tables_to_process)}", flush=True)

    with tempfile.TemporaryDirectory() as work_dir:
        fgb_dir = os.path.join(work_dir, "fgb")
        os.makedirs(fgb_dir, exist_ok=True)

        manifest_layers = []
        for full_name, geom_col, safe_name in tables_to_process:

            print(f"[snapshot] Exporting '{full_name}' → {safe_name}.fgb ...", flush=True)
            try:
                fgb_path = snapshot_table(pg_conn, full_name, geom_col, safe_name, fgb_dir, target_crs)
            except RuntimeError as e:
                print(f"[snapshot] WARNING: Skipping '{full_name}': {e}", file=sys.stderr, flush=True)
                continue

            print(f"[snapshot] Converting '{safe_name}' → parquet ...", flush=True)
            convert_to_parquet(fgb_path, safe_name, fgb_dir)

            manifest_layers.append({"name": full_name, "safe_name": safe_name})
            print(f"[snapshot] Table '{full_name}' done.", flush=True)

        if not manifest_layers:
            print("[snapshot] ERROR: No tables could be exported.", file=sys.stderr, flush=True)
            sys.exit(1)

        # ── Deliver output ────────────────────────────────────────────────────
        manifest = {"layers": manifest_layers}
        if is_s3_output:
            prefix_key = output_prefix.replace(f"s3://{bucket}/", "", 1)
            for entry in manifest_layers:
                entry["fgb_key"] = f"{prefix_key}/{entry['safe_name']}.fgb"

            print(f"[snapshot] Uploading all files to {output_prefix} ...", flush=True)
            sync_cmd = [
                "aws", "s3", "sync", fgb_dir + "/", output_prefix + "/",
                "--endpoint-url", get_endpoint_url(),
                "--no-progress",
            ]
            sync_res = subprocess.run(sync_cmd, capture_output=True, text=True)
            if sync_res.returncode != 0:
                raise RuntimeError(f"aws s3 sync failed: {sync_res.stderr.strip()}")

            manifest_key = f"{prefix_key}/.manifest.json"
            print(f"[snapshot] Writing manifest to s3://{bucket}/{manifest_key} ...", flush=True)
            s3_put_json(bucket, manifest_key, manifest)
        else:
            os.makedirs(output_prefix, exist_ok=True)
            print(f"[snapshot] Copying output files to {output_prefix} ...", flush=True)
            for fname in os.listdir(fgb_dir):
                shutil.copy2(os.path.join(fgb_dir, fname), os.path.join(output_prefix, fname))
            manifest_path = os.path.join(output_prefix, ".manifest.json")
            with open(manifest_path, "w") as f:
                json.dump(manifest, f)

        print(f"[snapshot] Done. {len(manifest_layers)} table(s) snapshotted.", flush=True)
        print(json.dumps(manifest), flush=True)


if __name__ == "__main__":
    main()
