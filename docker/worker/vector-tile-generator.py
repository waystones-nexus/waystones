#!/usr/bin/env python3
"""
vector-tile-generator.py — PostGIS/GPKG → PMTiles worker.

Generates high-performance vector tiles (MVT) packed in a PMTiles archive.
Uses ogr2ogr for extraction and tippecanoe for tiling.
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
    p = argparse.ArgumentParser(description="Generate PMTiles from PostGIS or GeoPackage")
    p.add_argument("--source",        required=False, help="Source .gpkg (local or s3://)")
    p.add_argument("--output-prefix", required=True,  help="Output destination: local dir or s3:// prefix")
    p.add_argument("--user-id",       required=True,  help="User ID (for logging)")
    p.add_argument("--model",         required=False, default=None, help="Path to model.json for layer mapping")
    p.add_argument("--min-zoom",      type=int, default=0,  help="Min zoom level")
    p.add_argument("--max-zoom",      type=int, default=14, help="Max zoom level")
    return p.parse_args()

# ---------------------------------------------------------------------------
# S3 / DNS helpers (Reused from postgis-snapshot.py)
# ---------------------------------------------------------------------------

def force_ipv4_for_endpoint(endpoint_url: str):
    domain = urlparse(endpoint_url).hostname
    if not domain: return
    try:
        ipv4_addr = socket.gethostbyname(domain)
        with open("/etc/hosts", "a") as f:
            f.write(f"\n{ipv4_addr} {domain}\n")
        print(f"[tiles] Forced {domain} to {ipv4_addr} in /etc/hosts", flush=True)
    except Exception as e:
        print(f"[tiles] Warning: DNS override failed: {e}", flush=True)

def get_endpoint_url() -> str:
    return os.environ.get("AWS_ENDPOINT_URL") or os.environ.get("S3_ENDPOINT", "")

def s3_cp(src: str, dst: str) -> None:
    cmd = ["aws", "s3", "cp", src, dst, "--endpoint-url", get_endpoint_url(), "--no-progress"]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"aws s3 cp failed: {result.stderr.strip()}")

def to_safe_name(name: str) -> str:
    safe = re.sub(r"[^a-z0-9]", "_", name.lower())
    safe = re.sub(r"_+", "_", safe)
    return safe.strip("_") or "layer"

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def build_pg_connection_string() -> str:
    host     = os.environ.get("PG_HOST")
    if not host: return None
    port     = os.environ.get("PG_PORT", "5432")
    dbname   = os.environ["PG_DB"]
    user     = os.environ["PG_USER"]
    password = os.environ["PG_PASSWORD"]
    return f"PG:host={host} port={port} dbname={dbname} user={user} password={password}"

def list_layers(src_conn: str) -> list:
    """List layers in the source."""
    cmd = ["ogrinfo", "-ro", "-so", "-al", src_conn]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return []
    layers = []
    for line in result.stdout.splitlines():
        if line.startswith("Layer name:"):
            layers.append(line.split(":", 1)[1].strip())
    return layers

# ---------------------------------------------------------------------------
# Tiling logic
# ---------------------------------------------------------------------------

def generate_pmtiles(src_conn: str, layer_name: str, safe_name: str, out_path: str, min_z: int, max_z: int):
    """Extract layer to GeoJSONSeq and tile via tippecanoe."""
    print(f"[tiles] Processing layer '{layer_name}' (Z{min_z}-Z{max_z})", flush=True)
    
    # We pipe ogr2ogr (GeoJSONSeq) directly into tippecanoe to save disk space
    # and improve performance.
    
    # 1. Extraction command (ogr2ogr)
    # Note: We reproject to EPSG:4326 for tippecanoe
    extract_cmd = [
        "ogr2ogr",
        "-f", "GeoJSONSeq",
        "/vsistdout/",
        src_conn,
        layer_name,
        "-t_srs", "EPSG:4326",
        "-lco", "RS=YES" # Use newline delimiting
    ]

    # 2. Tiling command (tippecanoe)
    tile_cmd = [
        "tippecanoe",
        "-o", out_path,
        "-z", str(max_z),
        "-Z", str(min_z),
        "--layer", safe_name,
        "--drop-densest-as-needed",
        "--extend-zooms-if-still-dropping",
        "--force"
    ]

    print(f"[tiles] Executing: {' '.join(extract_cmd)} | {' '.join(tile_cmd)}", flush=True)
    
    p1 = subprocess.Popen(extract_cmd, stdout=subprocess.PIPE)
    p2 = subprocess.Popen(tile_cmd, stdin=p1.stdout)
    
    p1.stdout.close()
    p2.communicate()

    if p2.returncode != 0:
        raise RuntimeError(f"Tiling failed for layer '{layer_name}'")

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = parse_args()
    output_prefix = args.output_prefix
    is_s3_output  = output_prefix.startswith("s3://")
    
    if is_s3_output:
        force_ipv4_for_endpoint(get_endpoint_url())

    # 1. Resolve source
    pg_conn = build_pg_connection_string()
    src_conn = pg_conn if pg_conn else args.source
    
    if not src_conn:
        print("[tiles] ERROR: No source (PostGIS or GPKG) provided.", file=sys.stderr)
        sys.exit(1)

    if src_conn.startswith("s3://"):
        # Download GPKG if source is S3
        tmp_gpkg = "/tmp/source.gpkg"
        print(f"[tiles] Downloading source from {src_conn}...", flush=True)
        s3_cp(src_conn, tmp_gpkg)
        src_conn = tmp_gpkg

    # 2. Determine layers
    all_layers = list_layers(src_conn)
    tables_to_process = [] # (original_name, safe_name)

    tables_raw = os.environ.get("TABLES", "").strip()
    if tables_raw:
        requested = [t.strip() for t in tables_raw.split(",") if t.strip()]
        for req in requested:
            if req in all_layers:
                tables_to_process.append((req, to_safe_name(req)))
    else:
        for l in all_layers:
            tables_to_process.append((l, to_safe_name(l)))

    if not tables_to_process:
        print(f"[tiles] ERROR: No layers found to process in {src_conn}", file=sys.stderr)
        sys.exit(1)

    print(f"[tiles] Starting generation for {len(tables_to_process)} layer(s)", flush=True)

    with tempfile.TemporaryDirectory() as work_dir:
        manifest_layers = []
        total_bytes = 0
        
        for orig_name, safe_name in tables_to_process:
            pmtiles_name = f"{safe_name}.pmtiles"
            local_pmtiles = os.path.join(work_dir, pmtiles_name)
            
            try:
                generate_pmtiles(src_conn, orig_name, safe_name, local_pmtiles, args.min_zoom, args.max_zoom)
                
                # Calculate size
                file_size = os.path.getsize(local_pmtiles)
                total_bytes += file_size
                
                # Deliver output
                if is_s3_output:
                    dst_path = f"{output_prefix.rstrip('/')}/{pmtiles_name}"
                    print(f"[tiles] Uploading {pmtiles_name} ({file_size} bytes) to {dst_path}...", flush=True)
                    s3_cp(local_pmtiles, dst_path)
                else:
                    os.makedirs(output_prefix, exist_ok=True)
                    shutil.copy2(local_pmtiles, os.path.join(output_prefix, pmtiles_name))
                
                manifest_layers.append({
                    "name": orig_name,
                    "safe_name": safe_name,
                    "pmtiles": pmtiles_name,
                    "size": file_size
                })
                
            except Exception as e:
                print(f"[tiles] ERROR: Failed to tile '{orig_name}': {e}", file=sys.stderr, flush=True)

        # Write manifest
        manifest = {"layers": manifest_layers, "type": "pmtiles", "total_size": total_bytes}
        if is_s3_output:
            bucket = output_prefix.split("//")[1].split("/")[0]
            prefix = "/".join(output_prefix.split("//")[1].split("/")[1:])
            manifest_key = f"{prefix.rstrip('/')}/.tiles.json"
            
            with tempfile.NamedTemporaryFile(mode="w", suffix=".json", delete=False) as f:
                json.dump(manifest, f)
                tmp_manifest = f.name
            try:
                s3_cp(tmp_manifest, f"s3://{bucket}/{manifest_key}")
            finally:
                os.unlink(tmp_manifest)
        else:
            with open(os.path.join(output_prefix, ".tiles.json"), "w") as f:
                json.dump(manifest, f)

        # ── Callback to Cloud API for storage metering ────────────────────────
        app_url = os.environ.get("APP_URL", "").strip()
        secret  = os.environ.get("PEON_CALLBACK_SECRET", "").strip()
        proj_id = os.environ.get("PROJECT_ID", "").strip()

        if not app_url or not proj_id:
            print("[tiles] Warning: APP_URL or PROJECT_ID not set — skipping size callback.", flush=True)
        else:
            if not secret:
                print("[tiles] Warning: PEON_CALLBACK_SECRET not set — sending unauthenticated callback.", flush=True)
            try:
                import requests
                callback_url = f"{app_url.rstrip('/')}/api/projects/{proj_id}/tiles/report-size"
                print(f"[tiles] Reporting total size ({total_bytes} bytes) to {callback_url}...", flush=True)
                headers = {"Content-Type": "application/json"}
                if secret:
                    headers["X-Peon-Secret"] = secret
                resp = requests.post(
                    callback_url,
                    json={"totalBytes": total_bytes},
                    headers=headers,
                    timeout=10
                )
                print(f"[tiles] Callback response: {resp.status_code}", flush=True)
            except Exception as e:
                print(f"[tiles] Warning: Failed to report size to cloud: {e}", flush=True)

    print("[tiles] Done.", flush=True)

if __name__ == "__main__":
    main()
