#!/bin/bash
# boot.sh — unified entrypoint for the Waystones pygeoapi image.
#
# Supports:
# 1. Standard Mode: Runs pygeoapi on PORT (default 5000).
# 2. Sidecar Mode: Runs Caddy as a gateway on PORT (5000) and pygeoapi on 5001.
# 3. Gateway-Only: Runs only Caddy (if DEPLOY_PYGEOAPI=0).
#
# Environment Variables:
# - DEPLOY_PYGEOAPI: Set to 0 to disable the Python backend (default: 1)
# - PORT: The public port the container listens on (default: 5000)
# - CONTAINER_WORKERS: Number of gunicorn workers (default: 2)

set -euo pipefail

# ─── Environment Activation ───────────────────────────────────────────────
# Activate the venv paths baked into the image at build time.
if [ -s /etc/pygeoapi-venv-bin ]; then
    export PATH="$(cat /etc/pygeoapi-venv-bin):$PATH"
fi

if [ -s /etc/pygeoapi-site-packages ]; then
    export PYTHONPATH="$(cat /etc/pygeoapi-site-packages):${PYTHONPATH:-}"
fi

export PYGEOAPI_CONFIG="${PYGEOAPI_CONFIG:-/pygeoapi/local.config.yml}"
export PYGEOAPI_OPENAPI="/pygeoapi/local.openapi.yml"
export PYGEOAPI_TEMPLATES_PATH="/pygeoapi/local-templates"

# ─── Caddy Configuration ──────────────────────────────────────────────────
# Caddy needs a writable home for config/autosave/locks.
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/caddy_config
export XDG_DATA_HOME=/tmp/caddy_data

# ─ Decode config from env var if needed (legacy / ephemeral support) ──────
if [ ! -s "$PYGEOAPI_CONFIG" ] && [ -n "${PYGEOAPI_CONFIG_B64:-}" ]; then
    echo "[boot] Writing pygeoapi config from PYGEOAPI_CONFIG_B64..."
    echo "$PYGEOAPI_CONFIG_B64" | base64 -d > "$PYGEOAPI_CONFIG"
fi

# ─── Proactive Resource Wakeup ────────────────────────────────────────────
# If WMS is enabled, wake up the QGIS machine/service machine in the background.
if [ "${DEPLOY_QGIS:-0}" = "1" ] && [ -n "${FLY_APP_NAME:-}" ]; then
    (sleep 2 && \
     echo "[boot] Proactively waking up QGIS service..." && \
     curl -s -o /dev/null --retry 1 --connect-timeout 5 "http://${FLY_APP_NAME}.flycast:8080/health") &
fi

# ─── Process Management ───────────────────────────────────────────────────

# Determine if we should run in Sidecar mode (Caddy + pygeoapi)
# Default for community is simple mode (no sidecar) unless explicitly requested.
USE_SIDECAR="${DEPLOY_SIDE_GATEWAY:-0}"

if [ "${DEPLOY_PYGEOAPI:-1}" = "0" ]; then
    echo "[boot] Gateway-only mode. Starting Caddy..."
    exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
fi

if [ "$USE_SIDECAR" = "1" ]; then
    echo "[boot] Starting Caddy Gateway (Sidecar)..."
    export GOMAXPROCS=1
    caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

    echo "[boot] Routing pygeoapi to internal port 5001..."
    export CONTAINER_PORT=5001
    # Trust headers from the local Caddy sidecar
    export GUNICORN_CMD_ARGS="${GUNICORN_CMD_ARGS:-} --forwarded-allow-ips=127.0.0.1"
else
    export CONTAINER_PORT="${PORT:-5000}"
fi

# ─── Background Tasks ─────────────────────────────────────────────────────

if [ ! -f "$PYGEOAPI_CONFIG" ]; then
    echo "[boot] Warning: No pygeoapi config found at $PYGEOAPI_CONFIG"
else
    # Regenerate OpenAPI docs in the background so gunicorn starts immediately.
    (pygeoapi openapi generate "$PYGEOAPI_CONFIG" \
        --output-file "$PYGEOAPI_OPENAPI" 2>/dev/null; \
     echo "[boot] OpenAPI docs generated") &

    # Launch GeoParquet warmup if script exists
    if [ -f "/warmup.py" ]; then
        (sleep 5 && python3 /warmup.py) &
    fi
fi

# ─── Start Gunicorn ───────────────────────────────────────────────────────
echo "[boot] Starting pygeoapi on port ${CONTAINER_PORT}..."
exec gunicorn \
    --workers "${CONTAINER_WORKERS:-2}" \
    --worker-class=gthread \
    --threads 2 \
    --bind "${CONTAINER_HOST:-0.0.0.0}:${CONTAINER_PORT}" \
    --access-logfile - \
    --timeout 600 \
    pygeoapi.flask_app:APP
