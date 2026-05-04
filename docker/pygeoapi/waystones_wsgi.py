import os
import base64
import subprocess
import threading

_lock = threading.Lock()
_CONFIG_LOADED = False
_pygeoapi_app = None

CONFIG_PATH = os.environ.get("PYGEOAPI_CONFIG", "/pygeoapi/local.config.yml")
_TASKS_FLAG = "/tmp/waystones_tasks_triggered"


def _trigger_background_tasks():
    """Fire cache/warmup tasks once per container boot (best-effort dedup via flag file)."""
    if os.path.exists(_TASKS_FLAG):
        return
    try:
        open(_TASKS_FLAG, "w").close()
    except OSError:
        pass

    devnull = {"stdout": subprocess.DEVNULL, "stderr": subprocess.DEVNULL}

    # Generates openapi.yml (from S3 cache or live), then sends SIGHUP to reload workers.
    subprocess.Popen(["python3", "/cache_openapi.py", "--generate-and-reload"], **devnull)

    subprocess.Popen(
        ["pygeoapi", "asyncapi", "generate", CONFIG_PATH,
         "--output-file", "/pygeoapi/local.asyncapi.yml"],
        **devnull,
    )

    if os.path.exists("/warmup.py"):
        subprocess.Popen(["python3", "/warmup.py"], **devnull)


def _load_app():
    from pygeoapi.flask_app import APP
    return APP


def application(environ, start_response):
    global _CONFIG_LOADED, _pygeoapi_app

    if not _CONFIG_LOADED:
        with _lock:
            if not _CONFIG_LOADED:
                # Worker restarted after SIGHUP: config already on disk.
                if os.path.exists(CONFIG_PATH):
                    _pygeoapi_app = _load_app()
                    _CONFIG_LOADED = True
                else:
                    b64 = environ.get("HTTP_X_WAYSTONES_CONFIG_B64")
                    if not b64:
                        start_response("503 Service Unavailable", [
                            ("Content-Type", "text/plain"),
                            ("Retry-After", "5"),
                        ])
                        return [b"Service initializing. Missing X-Waystones-Config-B64 header."]

                    try:
                        config_bytes = base64.b64decode(b64)
                    except Exception:
                        start_response("400 Bad Request", [("Content-Type", "text/plain")])
                        return [b"Invalid X-Waystones-Config-B64: not valid base64."]

                    # Atomic write — never leaves a half-written config.
                    tmp = CONFIG_PATH + ".tmp"
                    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
                    with open(tmp, "wb") as f:
                        f.write(config_bytes)
                    os.replace(tmp, CONFIG_PATH)

                    print(f"[waystones_wsgi] Config written to {CONFIG_PATH}", flush=True)

                    _trigger_background_tasks()
                    _pygeoapi_app = _load_app()
                    _CONFIG_LOADED = True

    return _pygeoapi_app(environ, start_response)
