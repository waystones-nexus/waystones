#!/bin/bash
set -euo pipefail

# First boot initialization: if /data/ lacks .fgb files and source env vars are set, run the worker.
# Worker converts source data (GeoPackage or PostGIS) to FlatGeobuf in /data/ for QGIS Server.
# Subsequent boots: .fgb files already present, worker is skipped, QGIS Server starts immediately.
# For Railway: mount a persistent volume at /data/ to survive restarts.

mkdir -p /data || true

echo "[railway-qgis-boot] Checking for existing FlatGeobuf data in /data..."
if [ -z "$(ls -A /data/*.fgb 2>/dev/null)" ]; then
    echo "[railway-qgis-boot] No .fgb files found."

    if [ -n "${INPUT_URI:-}" ] || ( [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ] ); then
        echo "[railway-qgis-boot] First boot: source is configured. Running worker to convert data..."

        export INPUT_TYPE="${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="${OUTPUT_URI:-/data/}"

        if [ -z "${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
        fi

        if [ "$INPUT_TYPE" = "gpkg" ] && [ -z "${INPUT_URI:-}" ]; then
            export INPUT_URI="/input/data.gpkg"
        fi

        # Model awareness
        export MODEL_PATH=""
        if [ -f "/app/model.json" ]; then
            export MODEL_PATH="/app/model.json"
        fi

        echo "[railway-qgis-boot] Running worker..."
        python3 /app/worker/main.py
        
        echo "[railway-qgis-boot] Worker complete. Final volume contents:"
        ls -R /data
    else
        echo "[railway-qgis-boot] No source connection details found. Skipping worker (subsequent boot)."
    fi
else
    echo "[railway-qgis-boot] FlatGeobuf data already exists in /data (subsequent boot)."
fi

# Chown data so www-data can read it in QGIS
chown -R www-data:www-data /data || true

echo "[railway-qgis-boot] Handing over to qgis-entrypoint.sh..."
exec /entrypoint.sh
