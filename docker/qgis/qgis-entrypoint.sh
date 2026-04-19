#!/bin/bash
# entrypoint for the QGIS Server container

set -euo pipefail

# ─── Ensure /data directory exists ────────────────────────────────────────
mkdir -p /data

# Decode QGIS project from env
if [ -n "${QGIS_PROJECT_B64:-}" ] && [ ! -f "/data/project.qgs" ]; then
    echo "[qgis-startup] Writing QGIS project from env..."
    echo "$QGIS_PROJECT_B64" | base64 -d > /data/project.qgs
fi

chown -R www-data:www-data /data
chmod 644 /data/project.qgs

# ─── BULLETPROOF ENVIRONMENT DUMP ─────────────────────────────────────────
echo "[qgis-startup] Capturing root environment for FastCGI..."
env | grep -E '^(AWS_|QGIS_|CPL_|GDAL_|QT_)' | sed 's/^/export /' > /tmp/qgis-env.sh
chmod 644 /tmp/qgis-env.sh

# ─── GDAL /vsis3/ Pre-flight ──────────────────────────────────────────────
FIRST_FGB=$(grep -oP '/vsis3/[^<"]+\.fgb' /data/project.qgs 2>/dev/null | head -1 || true)
if [ -n "$FIRST_FGB" ]; then
    echo "[qgis-startup] Testing GDAL access to: $FIRST_FGB"
    cat <<'PYEOF' > /tmp/test.py
import sys
try:
    from osgeo import ogr, gdal
    gdal.UseExceptions()
    ds = ogr.Open(sys.argv[1])
    if ds:
        print(f"[qgis-startup] Pre-flight: OK ({ds.GetLayerCount()} layer(s))", flush=True)
    else:
        print("[qgis-startup] Pre-flight: FAILED — ogr.Open returned None", flush=True)
except Exception as e:
    print(f"[qgis-startup] Pre-flight: FAILED — {e}", flush=True)
PYEOF
    su -s /bin/bash www-data -c "source /tmp/qgis-env.sh && python3 /tmp/test.py \"$FIRST_FGB\""
fi

# ─── FIX: INJECT VARIABLES INTO NGINX ──────────────────────────────────────
# Because QGIS Server wipes GDAL settings per request, Nginx MUST pass them!
echo "[qgis-startup] Injecting FastCGI parameters into Nginx..."
for file in /etc/nginx/fastcgi_params /etc/nginx/fastcgi.conf; do
    if [ -f "$file" ]; then
        echo "fastcgi_param AWS_ACCESS_KEY_ID \"${AWS_ACCESS_KEY_ID:-}\";" >> "$file"
        echo "fastcgi_param AWS_SECRET_ACCESS_KEY \"${AWS_SECRET_ACCESS_KEY:-}\";" >> "$file"
        echo "fastcgi_param AWS_S3_ENDPOINT \"${AWS_ENDPOINT_URL:-${AWS_S3_ENDPOINT:-}}\";" >> "$file"
        echo "fastcgi_param AWS_VIRTUAL_HOSTING \"FALSE\";" >> "$file"
        echo "fastcgi_param AWS_HTTPS \"YES\";" >> "$file"
        echo "fastcgi_param CPL_VSIL_CURL_USE_HEAD \"FALSE\";" >> "$file"
    fi
done

# ─── Generate QGIS FastCGI Wrapper ─────────────────────────────────────────
echo "[qgis-startup] Generating FastCGI wrapper..."

cat <<'EOF' > /usr/local/bin/qgis-wrapper.sh
#!/bin/bash
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
source /tmp/qgis-env.sh

# PREVENT HANGING & NETWORK BUGS
export HOME=/tmp
export XDG_RUNTIME_DIR=/tmp
export QGIS_OPTIONS_PATH=/tmp
export QGIS_CUSTOM_CONFIG_PATH=/tmp
export QT_BEARER_POLL_TIMEOUT=-1

export QGIS_PROJECT_FILE="/data/project.qgs"
export QT_QPA_PLATFORM="offscreen"

export QGIS_SERVER_LOG_LEVEL=0
export QGIS_SERVER_LOG_FILE="/tmp/qgis-server.log"
export QGIS_SERVER_LOG_STDERR=1

exec /usr/lib/cgi-bin/qgis_mapserv.fcgi
EOF

chmod +x /usr/local/bin/qgis-wrapper.sh

# Prepare the log file
touch /tmp/qgis-server.log
chown www-data:www-data /tmp/qgis-server.log

echo "[qgis-startup] Starting QGIS Server on port 9993..."
spawn-fcgi -u www-data -g www-data -d /var/lib/qgis -p 9993 -- /usr/local/bin/qgis-wrapper.sh

# Stream QGIS logs to Fly console
tail -f /tmp/qgis-server.log &

echo "[qgis-startup] Starting nginx..."
exec nginx -g 'daemon off;'