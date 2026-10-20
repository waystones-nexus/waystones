#!/usr/bin/env python3
"""
vector-tile-generator.py — PostGIS/GPKG → PMTiles worker.

Generates high-performance vector tiles (MVT) packed in a PMTiles archive.
Uses ogr2ogr for extraction and tippecanoe for tiling.
"""

import argparse
import errno
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from urllib.parse import urlparse

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(description="Generate PMTiles from PostGIS or GeoPackage")
    p.add_argument("--source",        required=False, help="Source .gpkg (local or s3://)")
    p.add_argument("--output-prefix", required=True,  help="Output destination: local dir or s3:// prefix")
    p.add_argument("--user-id",       required=True,  help="User ID (for logging)")
    p.add_argument("--min-zoom",      type=int,   default=0,    help="Min zoom level")
    p.add_argument("--max-zoom",      type=int,   default=14,   help="Max zoom level")
    p.add_argument("--auto-zoom",     action="store_true",      help="Let tippecanoe pick max zoom from feature density (-zg)")
    p.add_argument("--simplification",type=float, default=None, help="Geometry simplification factor (tippecanoe --simplification)")
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
    except OSError as e:
        if e.errno == errno.EROFS:
            return  # read-only /etc/hosts; boto3 is already forced to IPv4 by _ensure_ipv4()
        print(f"[tiles] Warning: DNS override failed: {e}", flush=True)
    except Exception as e:
        print(f"[tiles] Warning: DNS override failed: {e}", flush=True)

def get_endpoint_url() -> str:
    return (
        os.environ.get("AWS_ENDPOINT_URL") or
        os.environ.get("S3_ENDPOINT") or
        None
    )

_ipv4_patched = False

def _ensure_ipv4():
    global _ipv4_patched
    if _ipv4_patched:
        return
    _orig = socket.getaddrinfo
    def _ipv4_only(host, port, family=0, type=0, proto=0, flags=0):
        try:
            return _orig(host, port, socket.AF_INET, type, proto, flags)
        except Exception:
            return _orig(host, port, family, type, proto, flags)
    socket.getaddrinfo = _ipv4_only
    _ipv4_patched = True

def _boto3_client():
    import boto3
    from botocore.config import Config

    endpoint = os.environ.get('AWS_ENDPOINT_URL') or os.environ.get('S3_ENDPOINT')
    if endpoint:
        _ensure_ipv4()
    endpoint_url = None
    if endpoint:
        endpoint_url = endpoint if endpoint.startswith(('http://', 'https://')) else f"https://{endpoint}"

    region = os.environ.get("AWS_DEFAULT_REGION")
    if not region:
        if endpoint_url and "r2.cloudflarestorage.com" in endpoint_url:
            region = "auto"
        else:
            region = "europe-west"

    config = Config(
        signature_version='s3v4',
        retries={'max_attempts': 3, 'mode': 'standard'}
    )

    kwargs = {
        "endpoint_url": endpoint_url,
        "region_name": region,
        "config": config,
    }
    if os.environ.get("AWS_ACCESS_KEY_ID"):
        kwargs["aws_access_key_id"] = os.environ.get("AWS_ACCESS_KEY_ID")
    if os.environ.get("AWS_SECRET_ACCESS_KEY"):
        kwargs["aws_secret_access_key"] = os.environ.get("AWS_SECRET_ACCESS_KEY")
    return boto3.client("s3", **kwargs)

def s3_cp(src: str, dst: str) -> None:
    client = _boto3_client()
    try:
        if src.startswith("s3://"):
            p = urlparse(src)
            client.download_file(p.netloc, p.path.lstrip("/"), dst)
        else:
            p = urlparse(dst)
            client.upload_file(src, p.netloc, p.path.lstrip("/"))
    except Exception as e:
        print(f"[tile-generator] S3 ERROR ({type(e).__name__}): {e}", flush=True)
        raise

def to_safe_name(name: str) -> str:
    safe = re.sub(r"[^a-z0-9]", "_", name.lower())
    safe = re.sub(r"_+", "_", safe)
    return safe.strip("_") or "layer"

# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def _conninfo_quote(value: str) -> str:
    """Quote a libpq conninfo value so spaces and quotes survive."""
    return "'" + value.replace("\\", "\\\\").replace("'", "\\'") + "'"

def build_pg_connection_string() -> str:
    host = os.environ.get("PG_HOST")
    if not host: return None
    # The password travels via PGPASSWORD (read by libpq) so it never appears in
    # ogr2ogr/ogrinfo argv, where it would show up in process listings and errors.
    password = os.environ.get("PG_PASSWORD", "")
    if password:
        os.environ["PGPASSWORD"] = password
    parts = {
        "host":   host,
        "port":   os.environ.get("PG_PORT", "5432"),
        "dbname": os.environ["PG_DB"],
        "user":   os.environ["PG_USER"],
    }
    return "PG:" + " ".join(f"{k}={_conninfo_quote(v)}" for k, v in parts.items())

# ogrinfo prints "1: roads (Line String)" or "2: table(geom) (Point)" per layer
_LAYER_LINE = re.compile(r"^\d+:\s+(.*?)(?:\s+\([^()]*\))?$")

def list_layers(src_conn: str) -> list:
    """List layer names in the source without computing feature counts/extents."""
    result = subprocess.run(["ogrinfo", "-ro", src_conn], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[tiles] ERROR: ogrinfo failed: {result.stderr.strip()}", file=sys.stderr, flush=True)
        return []
    layers = []
    for line in result.stdout.splitlines():
        m = _LAYER_LINE.match(line.strip())
        if m:
            layers.append(m.group(1))
    return layers

def _find_layer(source: str, available: list):
    """Match a requested source name against ogrinfo layer names."""
    if source in available:
        return source
    # PostGIS lists public-schema tables without the schema prefix
    if source.startswith("public.") and source[len("public."):] in available:
        return source[len("public."):]
    lowered = {a.lower(): a for a in available}
    return lowered.get(source.lower())

def resolve_layers(available: list):
    """
    Decide which source layers to tile and their MVT layer names.

    Returns (to_process, skipped): to_process is [(source_layer, mvt_name)],
    skipped is [{"name", "reason"}] for requested layers that can't be tiled.
    """
    skipped = []
    spec_raw = os.environ.get("TILE_LAYERS_JSON", "").strip()
    if spec_raw:
        # Explicit list from the cloud app: exactly the model's layers, named the way
        # its MapLibre style references them (source-layer).
        requested = [(item["source"], item.get("name") or item["source"]) for item in json.loads(spec_raw)]
    else:
        # Legacy payloads: TABLES or every layer, minus EXCLUDE_LAYERS
        tables_raw = os.environ.get("TABLES", "").strip()
        names = [t.strip() for t in tables_raw.split(",") if t.strip()] if tables_raw else list(available)
        excluded = {l.strip() for l in os.environ.get("EXCLUDE_LAYERS", "").split(",") if l.strip()}
        requested = [(n, n) for n in names if n not in excluded]

    to_process = []
    used = set()
    for source, name in requested:
        layer = _find_layer(source, available)
        if layer is None:
            skipped.append({"name": source, "reason": "not found in source"})
            continue
        base = to_safe_name(name)
        mvt_name, i = base, 2
        while mvt_name in used:  # never let two layers merge into one MVT layer
            mvt_name, i = f"{base}_{i}", i + 1
        used.add(mvt_name)
        to_process.append((layer, mvt_name))
    return to_process, skipped

# ---------------------------------------------------------------------------
# S3 output helpers
# ---------------------------------------------------------------------------

def delete_stale_archives(output_prefix: str, keep_filename: str) -> None:
    """Remove .pmtiles left behind by earlier runs (e.g. before a project rename)."""
    p = urlparse(output_prefix.rstrip("/") + "/")
    bucket, prefix = p.netloc, p.path.lstrip("/")
    client = _boto3_client()
    resp = client.list_objects_v2(Bucket=bucket, Prefix=prefix)
    for obj in resp.get("Contents", []):
        key = obj["Key"]
        if key.endswith(".pmtiles") and key != prefix + keep_filename:
            print(f"[tiles] Removing stale archive {key.rsplit('/', 1)[-1]}", flush=True)
            client.delete_object(Bucket=bucket, Key=key)

# ---------------------------------------------------------------------------
# Tiling logic — all layers extracted to GeoJSONSeq first, then one tippecanoe pass
# ---------------------------------------------------------------------------

AUTO_ZOOM_FLOOR = 12

def tippecanoe_command(args, output_path: str, extracted: list, project_name: str) -> list:
    cmd = [
        "tippecanoe",
        "-o", output_path,
        "-Z", str(args.min_zoom),
        "--drop-densest-as-needed",
        "--generate-ids",            # feature ids for MapLibre feature-state (hover/select)
        "--read-parallel",           # inputs are newline-delimited GeoJSONSeq
        "--progress-interval=10",
        "--force",
        "-n", project_name,
        "-N", f"Vector tiles for {project_name}",
        "-A", "Waystones",
    ]
    if args.auto_zoom:
        # -zg alone picks very low zooms for sparse data (65 castles → z3), and
        # overzoomed z3 tiles place points ~1 km off. Floor the guess at z12; -Bg sets
        # the base zoom to the real guess so sparse points aren't thinned out below z12.
        cmd.extend(["-zg", f"--smallest-maximum-zoom-guess={AUTO_ZOOM_FLOOR}", "-Bg"])
    else:
        cmd.extend(["-z", str(args.max_zoom)])
    if args.simplification is not None:
        cmd.extend(["--simplification", str(args.simplification)])
    exclude_raw = os.environ.get("EXCLUDE_ATTRIBUTES", "").strip()
    exclude_fields = [f.strip() for f in exclude_raw.split(",") if f.strip()] if exclude_raw else []
    if exclude_fields == ["*"]:
        cmd.append("--exclude-all")
    else:
        for field in exclude_fields:
            cmd.extend(["--exclude", field])
    for _, mvt_name, path in extracted:
        cmd.extend(["-L", f"{mvt_name}:{path}"])
    return cmd

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = parse_args()
    output_prefix = args.output_prefix
    is_s3_output  = output_prefix.startswith("s3://")
    tile_timeout  = int(os.environ.get("TILE_TIMEOUT_SECONDS", "7200"))

    if is_s3_output:
        force_ipv4_for_endpoint(get_endpoint_url())

    # 1. Resolve source
    pg_conn = build_pg_connection_string()
    src_conn = pg_conn if pg_conn else args.source

    if not src_conn:
        print("[tiles] ERROR: No source (PostGIS or GPKG) provided.", file=sys.stderr)
        sys.exit(1)

    with tempfile.TemporaryDirectory() as work_dir:
        if src_conn.startswith("s3://"):
            # Download into the per-task work dir so concurrent tasks don't share a file
            local_gpkg = os.path.join(work_dir, "source.gpkg")
            print("[tiles] Downloading source GeoPackage...", flush=True)
            s3_cp(src_conn, local_gpkg)
            src_conn = local_gpkg

        # 2. Determine layers
        available = list_layers(src_conn)
        tables_to_process, skipped = resolve_layers(available)

        if not tables_to_process:
            requested = ", ".join(s["name"] for s in skipped) or "(none)"
            print(f"[tiles] ERROR: No layers to tile. Requested: {requested}. Available: {', '.join(available) or '(none)'}", file=sys.stderr, flush=True)
            sys.exit(1)

        print(f"[tiles] Extracting {len(tables_to_process)} layer(s) then tiling in one pass", flush=True)

        # Step 1: Extract each layer to a GeoJSONSeq file
        extracted = []  # (orig_name, mvt_name, geojsonseq_path)
        for orig_name, mvt_name in tables_to_process:
            geojsonseq_path = os.path.join(work_dir, f"{mvt_name}.geojsonseq")
            print(f"[tiles] Extracting '{orig_name}'...", flush=True)
            extract_cmd = [
                "ogr2ogr",
                "-f", "GeoJSONSeq",
                geojsonseq_path,
                src_conn,
                orig_name,
                "-t_srs", "EPSG:4326",
                "-dim", "XY",          # MVT is 2D; Z/M values are wasted bytes
            ]
            result = subprocess.run(extract_cmd, capture_output=True, text=True)
            if result.returncode != 0:
                stderr = result.stderr.strip()
                reason = stderr.splitlines()[-1] if stderr else f"ogr2ogr exit {result.returncode}"
                print(f"[tiles] WARNING: skipping '{orig_name}': {stderr}", file=sys.stderr, flush=True)
                skipped.append({"name": orig_name, "reason": reason})
                continue
            extracted.append((orig_name, mvt_name, geojsonseq_path))

        if not extracted:
            print("[tiles] ERROR: No layers extracted successfully.", file=sys.stderr, flush=True)
            sys.exit(1)

        # Step 2: Single tippecanoe pass — all layers → one named .pmtiles
        project_name = os.environ.get("PROJECT_NAME", "").strip() or "combined"
        output_filename = f"{project_name}.pmtiles"
        combined_pmtiles = os.path.join(work_dir, output_filename)
        tile_cmd = tippecanoe_command(args, combined_pmtiles, extracted, project_name)

        zoom_label = f"Z{args.min_zoom}-auto" if args.auto_zoom else f"Z{args.min_zoom}-Z{args.max_zoom}"
        print(f"[tiles] Tiling {len(extracted)} layer(s) into {output_filename} ({zoom_label})...", flush=True)
        try:
            result = subprocess.run(tile_cmd, timeout=tile_timeout)
        except subprocess.TimeoutExpired:
            print(f"[tiles] ERROR: tippecanoe exceeded {tile_timeout}s. Try a lower max zoom or exclude attributes.", file=sys.stderr, flush=True)
            sys.exit(1)
        if result.returncode != 0:
            print("[tiles] ERROR: tippecanoe failed.", file=sys.stderr, flush=True)
            sys.exit(1)

        total_bytes = os.path.getsize(combined_pmtiles)

        # Step 3: Deliver output. Archive first, manifest last, so the manifest never
        # points at an archive that isn't there yet.
        manifest = {
            "type": "pmtiles",
            "pmtiles": output_filename,
            "layers": [{"name": orig_name, "safe_name": mvt_name} for orig_name, mvt_name, _ in extracted],
            "total_size": total_bytes,
            "version": str(int(time.time())),  # cache-busts tile URLs after regeneration
        }
        if skipped:
            manifest["skipped_layers"] = skipped

        if is_s3_output:
            dst_path = f"{output_prefix.rstrip('/')}/{output_filename}"
            print(f"[tiles] Uploading {output_filename} ({total_bytes} bytes) to {dst_path}...", flush=True)
            s3_cp(combined_pmtiles, dst_path)

            tmp_manifest = os.path.join(work_dir, ".tiles.json")
            with open(tmp_manifest, "w") as f:
                json.dump(manifest, f)
            s3_cp(tmp_manifest, f"{output_prefix.rstrip('/')}/.tiles.json")

            try:
                delete_stale_archives(output_prefix, output_filename)
            except Exception as e:
                print(f"[tiles] Warning: stale archive cleanup failed: {e}", flush=True)
        else:
            os.makedirs(output_prefix, exist_ok=True)
            shutil.copy2(combined_pmtiles, os.path.join(output_prefix, output_filename))
            with open(os.path.join(output_prefix, ".tiles.json"), "w") as f:
                json.dump(manifest, f)

        # ── Write Metrics for main.py callback ───────────────────────────────
        try:
            with open(os.environ.get("PEON_METRICS_PATH", "/tmp/.peon-metrics.json"), "w") as f:
                json.dump({"totalBytes": total_bytes, "skippedLayers": skipped}, f)
        except Exception as e:
            print(f"[tiles] Warning: Failed to write metrics file: {e}", flush=True)

    if skipped:
        print(f"[tiles] Done with {len(skipped)} skipped layer(s).", flush=True)
    else:
        print("[tiles] Done.", flush=True)

if __name__ == "__main__":
    main()
