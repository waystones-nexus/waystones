#!/usr/bin/env python3
"""
main.py — Universal worker entrypoint.

Reads 4 environment variables and routes to the appropriate conversion script:

  INPUT_TYPE   "gpkg" | "postgis"
  INPUT_URI    Source: local path (/input/data.gpkg), s3://bucket/key.gpkg,
               or postgresql://user:pass@host:5432/dbname
  OUTPUT_TYPE  "local" | "s3"
  OUTPUT_URI   Destination: local dir (/data/) or s3://bucket/prefix
  MODEL_PATH   Optional: Path to model.json for layer mapping/naming
  TARGET_CRS   Optional: Target CRS (default EPSG:4326) for normalization
  TASK_TYPE    Optional: "snapshot" (default) or "tiles"

For INPUT_TYPE=postgis the URI is parsed and individual PG_* env vars are
injected so postgis-snapshot.py's build_pg_connection_string() works unchanged.
"""

import os
import sys
import subprocess
from urllib.parse import urlparse

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))


def parse_pg_uri(uri: str) -> dict:
    """Parse postgresql://user:pass@host:port/dbname → PG_* env vars."""
    parsed = urlparse(uri)
    if parsed.scheme not in ("postgresql", "postgres"):
        raise ValueError(f"Expected a postgresql:// URI, got scheme {parsed.scheme!r}")
    return {
        "PG_HOST":     parsed.hostname or "localhost",
        "PG_PORT":     str(parsed.port or 5432),
        "PG_DB":       (parsed.path or "").lstrip("/"),
        "PG_USER":     parsed.username or "",
        "PG_PASSWORD": parsed.password or "",
    }


def main() -> None:
    input_type  = os.environ.get("INPUT_TYPE",  "").strip().lower()
    input_uri   = os.environ.get("INPUT_URI",   "").strip()
    output_type = os.environ.get("OUTPUT_TYPE", "").strip().lower()
    output_uri  = os.environ.get("OUTPUT_URI",  "").strip()
    model_path  = os.environ.get("MODEL_PATH",  "").strip()

    missing = [name for name, val in [
        ("INPUT_TYPE",  input_type),
        ("INPUT_URI",   input_uri),
        ("OUTPUT_TYPE", output_type),
        ("OUTPUT_URI",  output_uri),
    ] if not val]
    if missing:
        print(
            f"[main] ERROR: Missing required environment variable(s): {', '.join(missing)}",
            file=sys.stderr, flush=True,
        )
        sys.exit(1)

    if input_type not in ("gpkg", "postgis"):
        print(
            f"[main] ERROR: Unsupported INPUT_TYPE={input_type!r}. Must be 'gpkg' or 'postgis'.",
            file=sys.stderr, flush=True,
        )
        sys.exit(1)

    if output_type not in ("local", "s3"):
        print(
            f"[main] ERROR: Unsupported OUTPUT_TYPE={output_type!r}. Must be 'local' or 's3'.",
            file=sys.stderr, flush=True,
        )
        sys.exit(1)

    # The Parquet/FlatGeobuf pipeline must always output WGS84 so that bbox columns
    # are in decimal degrees and pygeoapi spatial filtering works correctly.
    # TARGET_CRS is provided as an escape hatch for advanced use; otherwise hardcode WGS84.
    target_crs = os.environ.get("TARGET_CRS", "").strip() or "EPSG:4326"
    print(f"[main] Target CRS for reprojection: {target_crs}", flush=True)

    print(f"[main] INPUT_TYPE={input_type}   INPUT_URI={input_uri}",  flush=True)
    print(f"[main] OUTPUT_TYPE={output_type}  OUTPUT_URI={output_uri}", flush=True)
    if model_path:
        print(f"[main] MODEL_PATH={model_path}", flush=True)

    env = os.environ.copy()
    env["TARGET_CRS"] = target_crs
    task_type = os.environ.get("TASK_TYPE", "snapshot").strip().lower()

    if task_type == "tiles":
        script = os.path.join(SCRIPTS_DIR, "vector-tile-generator.py")
        cmd = [
            sys.executable, script,
            f"--output-prefix={output_uri}",
            "--user-id=local",
        ]
        if input_type == "gpkg":
            cmd.append(f"--source={input_uri}")
        else: # postgis
            try:
                pg_vars = parse_pg_uri(input_uri)
                env.update(pg_vars)
            except Exception as exc:
                print(f"[main] ERROR: {exc}", file=sys.stderr, flush=True)
                sys.exit(1)
        
        if model_path:
            cmd.append(f"--model={model_path}")
        
        # Pass zoom levels if provided
        min_z = os.environ.get("MIN_ZOOM")
        max_z = os.environ.get("MAX_ZOOM")
        if min_z: cmd.append(f"--min-zoom={min_z}")
        if max_z: cmd.append(f"--max-zoom={max_z}")

    elif input_type == "gpkg":
        script = os.path.join(SCRIPTS_DIR, "gpkg-converter.py")
        cmd = [
            sys.executable, script,
            f"--source={input_uri}",
            f"--output-prefix={output_uri}",
            "--user-id=local",
            f"--target-crs={target_crs}",
        ]
        if model_path:
            cmd.append(f"--model={model_path}")

    else:  # postgis
        try:
            pg_vars = parse_pg_uri(input_uri)
        except (ValueError, Exception) as exc:
            print(
                f"[main] ERROR: Cannot parse INPUT_URI as a PostgreSQL URI: {exc}",
                file=sys.stderr, flush=True,
            )
            sys.exit(1)

        env.update(pg_vars)
        print(
            f"[main] Resolved PostGIS connection: "
            f"{pg_vars['PG_USER']}@{pg_vars['PG_HOST']}:{pg_vars['PG_PORT']}/{pg_vars['PG_DB']}",
            flush=True,
        )

        script = os.path.join(SCRIPTS_DIR, "postgis-snapshot.py")
        cmd = [
            sys.executable, script,
            f"--output-prefix={output_uri}",
            "--user-id=local",
        ]
        if model_path:
            cmd.append(f"--model={model_path}")

    print(f"[main] Executing: {' '.join(cmd)}", flush=True)

    # Stream the sub-script's output directly — no capture so logs flow to container stdout.
    result = subprocess.run(cmd, env=env)

    if result.returncode != 0:
        print(
            f"[main] ERROR: Worker script exited with code {result.returncode}.",
            file=sys.stderr, flush=True,
        )
        sys.exit(result.returncode)

    print("[main] Worker completed successfully.", flush=True)


if __name__ == "__main__":
    main()
