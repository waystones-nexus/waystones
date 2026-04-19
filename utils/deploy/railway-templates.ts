/**
 * railway-templates.ts
 * 
 * Static templates for Railway Dockerfiles and boot scripts.
 * These are included in the deployment export when the Railway target is selected.
 */

export function generateDockerfile(isGpkg: boolean, gpkgFilename?: string): string {
  let df = `FROM ghcr.io/henrik716/waystones:pygeoapi-latest

USER root

# Install dependencies for the worker
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gdal-bin \\
    libgdal-dev \\
    libpq5 \\
    curl \\
    unzip \\
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \\
    && unzip /tmp/awscliv2.zip -d /tmp \\
    && /tmp/aws/install \\
    && rm -rf /tmp/awscliv2.zip /tmp/aws

WORKDIR /app

# COPY the worker scripts from docker/worker/ into this image.
COPY docker/worker/*.py /app/worker/

# COPY a new railway-boot.sh into the image
COPY docker/railway/railway-boot.sh /railway-boot.sh
RUN chmod +x /railway-boot.sh

# Bake in branded HTML templates
COPY docker/pygeoapi/html-templates/ /pygeoapi/local-templates/
`;

  if (isGpkg && gpkgFilename) {
    df += `
# Copy GeoPackage into the image if present at data/${gpkgFilename}.
# Build succeeds even when absent — in that case mount a Railway Volume
# at /input/ containing ${gpkgFilename} so railway-boot.sh can find it.
RUN --mount=type=bind,source=.,target=/build \\
    mkdir -p /input && \\
    if [ -f /build/data/${gpkgFilename} ]; then \\
        cp /build/data/${gpkgFilename} /input/data.gpkg && \\
        echo "[build] GeoPackage baked in from data/${gpkgFilename}"; \\
    else \\
        echo "[build] data/${gpkgFilename} not in repo — provide via Railway Volume at /input/"; \\
    fi
`;
  }

  df += `
# Sync configuration and any other data from the repo if they exist.
# We bake data into /app/data-sync/ to avoid it being masked by a volume mount at /data/
RUN --mount=type=bind,source=.,target=/build \\
    mkdir -p /data /app/data-sync && \\
    if [ -f /build/pygeoapi-config.yml ]; then \\
        cp /build/pygeoapi-config.yml /pygeoapi/local.config.yml; \\
        echo "[build] Config baked in from repo root"; \\
    fi && \\
    if [ -d /build/data ] && [ "$(ls -A /build/data 2>/dev/null)" ]; then \\
        cp -r /build/data/* /app/data-sync/ || true; \\
        echo "[build] Data baked into /app/data-sync/"; \\
    fi

ENTRYPOINT ["/railway-boot.sh"]
`;

  return df;
}

export const dockerfileQgis = `FROM ghcr.io/henrik716/waystones:qgis-latest

USER root

# Install dependencies for the worker
RUN apt-get update && apt-get install -y --no-install-recommends \\
    gdal-bin \\
    libgdal-dev \\
    libpq5 \\
    curl \\
    unzip \\
    python3-pip \\
    && rm -rf /var/lib/apt/lists/*

RUN pip3 install --no-cache-dir --break-system-packages duckdb

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \\
    && unzip /tmp/awscliv2.zip -d /tmp \\
    && /tmp/aws/install \\
    && rm -rf /tmp/awscliv2.zip /tmp/aws

WORKDIR /app

# COPY the worker scripts from docker/worker/ into this image.
COPY docker/worker/*.py /app/worker/

# COPY a new qgis-boot.sh into the image
COPY docker/railway/qgis-boot.sh /qgis-boot.sh
RUN chmod +x /qgis-boot.sh

ENTRYPOINT ["/qgis-boot.sh"]
`;

export const railwayBoot = `#!/bin/bash
set -euo pipefail

# This script handles the initialization process.
# If /data/ is empty and INPUT_URI is present, it executes the worker script (saving outputs to /data/).
# Once the data exists, it hands over to the standard API boot process

mkdir -p /data || true

echo "[railway-boot] Checking for existing data in /data..."

# If /data/ is empty, check if we have baked-in data to sync
if [ -z "$(ls -A /data 2>/dev/null)" ] && [ -d /app/data-sync ] && [ "$(ls -A /app/data-sync 2>/dev/null)" ]; then
    echo "[railway-boot] Initializing /data volume from baked-in data..."
    cp -r /app/data-sync/* /data/
fi

if [ -z "$(ls -A /data 2>/dev/null)" ]; then
    echo "[railway-boot] Data directory is empty or missing."
    
    # Check if we have the minimum environment required to run the worker
    if [ -n "\${INPUT_URI:-}" ] || ( [ -n "\${POSTGRES_HOST:-}" ] && [ -n "\${POSTGRES_DB:-}" ] ); then
        echo "[railway-boot] Initialization starting (Snapshotting)..."
        
        # Inject Universal Contract defaults if not provided
        export INPUT_TYPE="\${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="\${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="\${OUTPUT_URI:-/data/}"
        
        # Build INPUT_URI for PostGIS if needed
        if [ -z "\${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://\${POSTGRES_USER}:\${POSTGRES_PASSWORD}@\${POSTGRES_HOST}:\${POSTGRES_PORT:-5432}/\${POSTGRES_DB}"
        fi
        
        if [ "$INPUT_TYPE" = "gpkg" ] && [ -z "\${INPUT_URI:-}" ]; then
            export INPUT_URI="/input/data.gpkg"
        fi
        
        echo "[railway-boot] Running Conversion Worker..."
        python3 /app/worker/main.py
        
        echo "[railway-boot] Initialization complete. Data prepared."
    else
        echo "[railway-boot] No source connection details found (INPUT_URI or POSTGRES_HOST). Skipping initial snapshot."
        echo "[railway-boot] Warning: The pygeoapi server may fail to start if it expects GeoParquet data."
    fi
else
    echo "[railway-boot] Data already exists in /data. Skipping initial snapshot."
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

    missing = [name for name, val in [
        ("INPUT_TYPE",  input_type),
        ("INPUT_URI",   input_uri),
        ("OUTPUT_TYPE", output_type),
        ("OUTPUT_URI",  output_uri),
    ] if not val]
    if missing:
        sys.exit(1)

    env = os.environ.copy()
    if input_type == "gpkg":
        script = os.path.join(SCRIPTS_DIR, "gpkg-converter.py")
        cmd = [sys.executable, script, f"--source={input_uri}", f"--output-prefix={output_uri}", "--user-id=local"]
    else:
        pg_vars = parse_pg_uri(input_uri)
        env.update(pg_vars)
        script = os.path.join(SCRIPTS_DIR, "postgis-snapshot.py")
        cmd = [sys.executable, script, f"--output-prefix={output_uri}", "--user-id=local"]

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
