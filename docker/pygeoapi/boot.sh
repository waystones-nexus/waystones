#!/bin/bash
# boot.sh — unified entrypoint for the Waystones pygeoapi image.
# Universal script for both Open Source (Docker Compose) and SaaS (Fly.io).

set -euo pipefail

# ─── Environment Activation ───────────────────────────────────────────────
if [ -s /etc/pygeoapi-venv-bin ]; then
    export PATH="$(cat /etc/pygeoapi-venv-bin):$PATH"
    echo "[startup] Activated venv: $(cat /etc/pygeoapi-venv-bin)"
fi

if [ -s /etc/pygeoapi-site-packages ]; then
    export PYTHONPATH="$(cat /etc/pygeoapi-site-packages):${PYTHONPATH:-}"
fi

export PYGEOAPI_CONFIG="${PYGEOAPI_CONFIG:-/pygeoapi/local.config.yml}"
export PYGEOAPI_OPENAPI="/pygeoapi/local.openapi.yml"
export PYGEOAPI_TEMPLATES_PATH="/pygeoapi/local-templates"

# ─── Caddy Configuration ──────────────────────────────────────────────────
export HOME=/tmp
export XDG_CONFIG_HOME=/tmp/caddy_config
export XDG_DATA_HOME=/tmp/caddy_data

# ─── Proactive QGIS Wakeup ────────────────────────────────────────────────
# Only runs if WMS is enabled AND a wakeup URL is provided by the host environment
if [ "${DEPLOY_QGIS:-0}" = "1" ] && [ -n "${WMS_WAKEUP_URL:-}" ]; then
    (sleep 2 && \
     echo "[startup] Proactively waking up QGIS (WMS) machine..." && \
     curl -s -o /dev/null --retry 1 --connect-timeout 5 "${WMS_WAKEUP_URL}") &
fi

# ─── Config Injection Fallback ────────────────────────────────────────────
if [ ! -s "$PYGEOAPI_CONFIG" ] && [ -n "${PYGEOAPI_CONFIG_B64:-}" ]; then
    echo "[startup] Writing pygeoapi config from PYGEOAPI_CONFIG_B64..."
    echo "$PYGEOAPI_CONFIG_B64" | base64 -d > "$PYGEOAPI_CONFIG"
fi

# ─── Process Management ───────────────────────────────────────────────────
USE_SIDECAR="${DEPLOY_SIDE_GATEWAY:-0}"

if [ "${DEPLOY_PYGEOAPI:-1}" = "0" ]; then
    echo "[startup] Gateway-only mode. Starting Caddy..."
    exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
fi

# If sidecar is requested OR we have a WMS Wakeup URL (implying cloud/SaaS routing)
if [ "$USE_SIDECAR" = "1" ] || [ -n "${WMS_WAKEUP_URL:-}" ]; then
    echo "[startup] Starting Caddy Gateway (Sidecar)..."
    export GOMAXPROCS=1
    caddy run --config /etc/caddy/Caddyfile --adapter caddyfile &

    echo "[startup] Routing pygeoapi to internal port 5001..."
    export CONTAINER_PORT=5001
    export GUNICORN_CMD_ARGS="${GUNICORN_CMD_ARGS:-} --forwarded-allow-ips=127.0.0.1"
else
    export CONTAINER_PORT="${PORT:-5000}"
fi

# ─── Background Tasks ─────────────────────────────────────────────────────
if [ -f "$PYGEOAPI_CONFIG" ]; then
    echo "[startup] Launching background workers..."

    # 1. Cache-aware OpenAPI (Downloads from S3 or Generates)
    python3 /cache_openapi.py &

    # 2. AsyncAPI generation (Lightweight)
    (pygeoapi asyncapi generate "$PYGEOAPI_CONFIG" --output-file /pygeoapi/local.asyncapi.yml 2>/dev/null || true) &

    # 3. DuckDB / Parquet Warmup
    if [ -f "/warmup.py" ]; then
        (sleep 5 && python3 /warmup.py) &
    fi
else
    echo "[startup] Warning: No pygeoapi config found at $PYGEOAPI_CONFIG"
fi

# ─── Start Gunicorn ───────────────────────────────────────────────────────
echo "[startup] Starting Gunicorn on port ${CONTAINER_PORT}..."
exec gunicorn \
    --workers "${CONTAINER_WORKERS:-2}" \
    --worker-class=gthread \
    --threads 2 \
    --bind "${CONTAINER_HOST:-0.0.0.0}:${CONTAINER_PORT}" \
    --access-logfile - \
    --timeout 6000 \
    pygeoapi.flask_app:APP