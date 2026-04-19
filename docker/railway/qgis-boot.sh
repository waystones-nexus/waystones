#!/bin/bash
set -euo pipefail

mkdir -p /data || true

echo "[railway-qgis-boot] Checking for existing data in /data..."
if [ -z "$(ls -A /data/*.fgb 2>/dev/null)" ]; then
    echo "[railway-qgis-boot] Data directory lacks .fgb files."
    
    if [ -n "${INPUT_URI:-}" ] || ( [ -n "${POSTGRES_HOST:-}" ] && [ -n "${POSTGRES_DB:-}" ] ); then
        echo "[railway-qgis-boot] Activation Ritual starting (Snapshotting FlatGeobufs)..."
        
        export INPUT_TYPE="${INPUT_TYPE:-postgis}"
        export OUTPUT_TYPE="${OUTPUT_TYPE:-local}"
        export OUTPUT_URI="${OUTPUT_URI:-/data/}"
        
        if [ -z "${INPUT_URI:-}" ] && [ "$INPUT_TYPE" = "postgis" ]; then
            export INPUT_URI="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT:-5432}/${POSTGRES_DB}"
        fi
        
        if [ "$INPUT_TYPE" = "gpkg" ] && [ -z "${INPUT_URI:-}" ]; then
            export INPUT_URI="/input/data.gpkg"
        fi
        
        echo "[railway-qgis-boot] Running Peon Worker..."
        python3 /app/worker/main.py
        
        echo "[railway-qgis-boot] Activation Ritual complete."
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
