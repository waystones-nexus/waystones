#!/bin/bash
set -euo pipefail

# First boot initialization: if /data/ is empty and source env vars are set, run the worker.
# Worker converts source data (GeoPackage or PostGIS) to GeoParquet and FlatGeobuf in /data/.
# Subsequent boots: /data/ already populated, worker is skipped, pygeoapi server starts immediately.
# For Railway: mount a persistent volume at /data/ to survive restarts.

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
    if [ -n "${INPUT_URI:-}" ] || ( [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ] ); then
        echo "[railway-boot] First boot: source is configured. Running worker to convert data..."

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

        echo "[railway-boot] Running worker..."
        python3 /app/worker/main.py

        echo "[railway-boot] Worker complete. Data ready in /data/."
    else
        echo "[railway-boot] No source connection details found (INPUT_URI or POSTGRES_HOST). Skipping initial snapshot."
        echo "[railway-boot] Warning: The pygeoapi server may fail to start if it expects GeoParquet data."
    fi
else
    echo "[railway-boot] Data already exists in /data. Skipping worker (subsequent boot)."
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
