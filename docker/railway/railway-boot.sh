#!/bin/bash
set -euo pipefail

# This script handles the "Activation Ritual".
# If /data/ is empty and INPUT_URI is present, it executes the worker script (saving outputs to /data/).
# Once the data exists, it hands over to the standard API boot process

mkdir -p /data || true

echo "[railway-boot] Checking for existing data in /data..."
if [ -z "$(ls -A /data 2>/dev/null)" ]; then
    echo "[railway-boot] Data directory is empty or missing."
    
    # Check if we have the minimum environment required to run the worker
    if [ -n "${INPUT_URI:-}" ] || ( [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ] ); then
        echo "[railway-boot] Activation Ritual starting (Snapshotting)..."
        
        # Inject Universal Contract defaults if not provided
        export INPUT_TYPE="${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="${OUTPUT_URI:-/data/}"
        
        # Build INPUT_URI for PostGIS if needed
        if [ -z "${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
        fi
        
        if [ "$INPUT_TYPE" = "gpkg" ] && [ -z "${INPUT_URI:-}" ]; then
            export INPUT_URI="/input/data.gpkg"
        fi
        
        echo "[railway-boot] Running Peon Worker..."
        python3 /app/worker/main.py
        
        echo "[railway-boot] Activation Ritual complete. Data prepared."
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
