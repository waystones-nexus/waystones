#!/bin/bash
set -euo pipefail

# First boot initialization: if /data/ is empty and source env vars are set, run the worker.
# Worker converts source data (GeoPackage or PostGIS) to GeoParquet and FlatGeobuf in /data/.
# Subsequent boots: /data/ already populated, worker is skipped, pygeoapi server starts immediately.
# For Railway: mount a persistent volume at /data/ to survive restarts.

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
    if [ -n "${INPUT_URI:-}" ] || [ -n "$LOCAL_GPKG" ] || ( [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ] ); then
        echo "[railway-boot] Starting unitialized volume setup..."

        # Auto-detect local GeoPackage if no URI is provided
        if [ -n "$LOCAL_GPKG" ] && [ -z "${INPUT_URI:-}" ]; then
            echo "[railway-boot] Using local GeoPackage as source: $LOCAL_GPKG"
            export INPUT_TYPE="gpkg"
            export INPUT_URI="$LOCAL_GPKG"
        fi

        # Inject Universal Contract defaults if not provided
        export INPUT_TYPE="${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="${OUTPUT_URI:-/data/}"

        # Build INPUT_URI for PostGIS if needed
        if [ -z "${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
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
