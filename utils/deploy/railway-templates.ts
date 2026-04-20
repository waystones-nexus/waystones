/**
 * railway-templates.ts
 * 
 * Static templates for Railway Dockerfiles and boot scripts.
 * These are included in the deployment export when the Railway target is selected.
 */

export function generateDockerfile(isGpkg: boolean, gpkgFilename?: string): string {
  const gpkgSync = (isGpkg && gpkgFilename) ? ` && \\
    # 3. Copy GeoPackage if present
    mkdir -p /input && \\
    if [ -f /tmp/build-context/data/${gpkgFilename} ]; then \\
        cp /tmp/build-context/data/${gpkgFilename} /input/data.gpkg; \\
    fi` : '';

  return `FROM ghcr.io/henrik716/waystones:pygeoapi-latest

USER root

# 1. Prevent apt-get from hanging on interactive prompts (like tzdata)
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies (cached)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gdal-bin \\
    libgdal-dev \\
    libpq5 \\
    curl \\
    unzip \\
    && rm -rf /var/lib/apt/lists/*

# 2. Install AWS CLI (added -q to unzip to prevent log-choking)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \\
    && unzip -q /tmp/awscliv2.zip -d /tmp \\
    && /tmp/aws/install \\
    && rm -rf /tmp/awscliv2.zip /tmp/aws

WORKDIR /app

# Direct COPY is faster and more reliable than the 'COPY .' sync logic.
# These folders are part of the well-defined Deployment Kit structure.
COPY docker/worker/*.py /app/worker/
COPY docker/railway/railway-boot.sh /railway-boot.sh
RUN chmod +x /railway-boot.sh

# Templates aligned with the export process (entry-point.ts)
COPY docker/pygeoapi/html-templates/ /pygeoapi/local-templates/

# Configuration
COPY model.json /app/model.json
COPY pygeoapi-config.yml /pygeoapi/local.config.yml

# We only use the build context sync for the optional data folder to keep it fast.
COPY . /tmp/build-context
RUN mkdir -p /data /app/data-sync && \\
    # 1. Sync Data
    if [ -d /tmp/build-context/data ] && [ "$(ls -A /tmp/build-context/data 2>/dev/null)" ]; then \\
        cp -r /tmp/build-context/data/* /app/data-sync/ || true; \\
    fi${gpkgSync} && \\
    rm -rf /tmp/build-context

# Default env vars
ENV PORT=80
ENV PYGEOAPI_SERVER_URL=http://localhost:5000

ENTRYPOINT ["/railway-boot.sh"]
`;
}


export const dockerfileQgis = `FROM ghcr.io/henrik716/waystones:qgis-latest

USER root

# 1. Prevent apt-get from hanging on interactive prompts (like tzdata)
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies (cached)
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gdal-bin \\
    libgdal-dev \\
    libpq5 \\
    curl \\
    unzip \\
    python3-pip \\
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages duckdb

# 2. Install AWS CLI (added -q to unzip to prevent log-choking)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \\
    && unzip -q /tmp/awscliv2.zip -d /tmp \\
    && /tmp/aws/install \\
    && rm -rf /tmp/awscliv2.zip /tmp/aws

WORKDIR /app

# Direct COPY is faster for core scripts
COPY docker/worker/*.py /app/worker/
COPY docker/railway/qgis-boot.sh /qgis-boot.sh
RUN chmod +x /qgis-boot.sh

# Build context sync for optional data only
COPY . /tmp/build-context
RUN mkdir -p /data && \\
    if [ -d /tmp/build-context/data ]; then \\
        cp -r /tmp/build-context/data/* /data/ || true; \\
    fi && \\
    rm -rf /tmp/build-context

ENTRYPOINT ["/qgis-boot.sh"]
`;

export const railwayBoot = `#!/bin/bash
set -euo pipefail

# This script handles the initialization process.
# If /data/ is empty and INPUT_URI is present, it executes the worker script (saving outputs to /data/).
# Once the data exists, it hands over to the standard API boot process

mkdir -p /data || true

echo "[railway-boot] Checking for existing data in /data..."

# baked-in data sync (aggressive no-clobber)
if [ -d /app/data-sync ] && [ "$(ls -A /app/data-sync 2>/dev/null)" ]; then
    echo "[railway-boot] Syncing baked-in data to /data (no-clobber)..."
    cp -rn /app/data-sync/* /data/ || true
fi

# Debug: Log the final contents of /data to help identify naming mismatches
echo "[railway-boot] Volume contents (/data):"
ls -R /data
echo "---"

# Detective work: see if we have source data vs. prepared data
LOCAL_GPKG=$(ls /data/*.gpkg 2>/dev/null | head -n 1 || true)
HAS_PARQUET=$(ls /data/*.parquet 2>/dev/null | head -n 1 || true)

# Model awareness
export MODEL_PATH=""
if [ -f "/app/model.json" ]; then
    export MODEL_PATH="/app/model.json"
fi

if [ -z "$HAS_PARQUET" ]; then
    echo "[railway-boot] No GeoParquet files found in /data. Initialization required."
    
    # Check if we have the minimum environment required to run the worker
    if [ -n "\${INPUT_URI:-}" ] || [ -n "$LOCAL_GPKG" ] || ( [ -n "\${POSTGRES_HOST:-}" ] && [ -n "\${POSTGRES_DB:-}" ] ); then
        echo "[railway-boot] Starting uninitialized volume setup..."
        
        # Auto-detect local GeoPackage if no URI is provided
        if [ -n "$LOCAL_GPKG" ] && [ -z "\${INPUT_URI:-}" ]; then
            echo "[railway-boot] Using local GeoPackage as source: $LOCAL_GPKG"
            export INPUT_TYPE="gpkg"
            export INPUT_URI="$LOCAL_GPKG"
        fi
        
        # Inject Universal Contract defaults if not provided
        export INPUT_TYPE="\${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="\${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="\${OUTPUT_URI:-/data/}"
        
        # Build INPUT_URI for PostGIS if needed
        if [ -z "\${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT:-5432}/\${POSTGRES_DB}"
        fi
        
        echo "[railway-boot] Running Conversion Worker..."
        python3 /app/worker/main.py
        
        echo "[railway-boot] Worker complete. Data ready in /data/."
    else
        echo "[railway-boot] No source data found (GeoPackage, S3, or PostGIS). Skipping initial snapshot."
        echo "[railway-boot] Warning: The pygeoapi server may fail to start if it expects GeoParquet data."
    fi
else
    echo "[railway-boot] GeoParquet data exists in /data. Skipping worker (subsequent boot)."
fi

# Switch to the pygeoapi nobody user's privileges to run the API properly
if [ "$(id -u)" = "0" ]; then
    chown -R nobody:nogroup /data
    chown -R nobody:nogroup /pygeoapi || true
    echo "[railway-boot] Handing over to standard pygeoapi boot (as nobody)..."
    exec su nobody -s /bin/bash -c "/boot.sh"
else
    echo "[railway-boot] Handing over to pygeoapi boot..."
    exec /boot.sh
fi
`;

export const qgisBoot = `#!/bin/bash
set -euo pipefail

mkdir -p /data || true

echo "[railway-qgis-boot] Checking for existing data in /data..."
if [ -z "$(ls -A /data/*.fgb 2>/dev/null)" ]; then
    echo "[railway-qgis-boot] Data directory lacks .fgb files."
    
    if [ -n "\${INPUT_URI:-}" ] || ( [ -n "\${POSTGRES_HOST:-}" ] && [ -n "\${POSTGRES_DB:-}" ] ); then
        echo "[railway-qgis-boot] Initialization starting (Snapshotting FlatGeobufs)..."
        
        export INPUT_TYPE="\${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="\${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="\${OUTPUT_URI:-/data/}"
        
        if [ -z "\${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT:-5432}/\${POSTGRES_DB}"
        fi
        
        if [ "$INPUT_TYPE" = "gpkg" ] && [ -z "\${INPUT_URI:-}" ]; then
            export INPUT_URI="/input/data.gpkg"
        fi
        
        echo "[railway-qgis-boot] Running Conversion Worker..."
        python3 /app/worker/main.py
        
        echo "[railway-qgis-boot] Initialization complete."
    else
        echo "[railway-qgis-boot] No source connection details found. Skipping initial snapshot."
    fi
else
    echo "[railway-qgis-boot] FlatGeobuf data already exists in /data."
fi

# Chown data so www-data can read it in QGIS
chown -R www-data:www-data /data || true

echo "[railway-qgis-boot] Handing over to qgis-entrypoint.sh..."
exec /entrypoint.sh
`;

export const workerMain = `#!/usr/bin/env python3
import os
import sys
import subprocess
from urllib.parse import urlparse

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))

def parse_pg_uri(uri: str) -> dict:
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

    print(f"[main] INPUT_TYPE={input_type}   INPUT_URI={input_uri}",  flush=True)
    print(f"[main] OUTPUT_TYPE={output_type}  OUTPUT_URI={output_uri}", flush=True)
    if model_path:
        print(f"[main] MODEL_PATH={model_path}", flush=True)

    env = os.environ.copy()

    if input_type == "gpkg":
        script = os.path.join(SCRIPTS_DIR, "gpkg-converter.py")
        cmd = [
            sys.executable, script,
            f"--source={input_uri}",
            f"--output-prefix={output_uri}",
            "--user-id=local",
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
    result = subprocess.run(cmd, env=env)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()
`;

export const workerGpkgConverter = `#!/usr/bin/env python3
import argparse, json, os, re, shutil, subprocess, sys, tempfile
# (Full implementation available in docker/worker/gpkg-converter.py)
`;

export const workerPostgisSnapshot = `#!/usr/bin/env python3
import argparse, json, os, re, shutil, subprocess, sys, tempfile
# (Full implementation available in docker/worker/postgis-snapshot.py)
`;
