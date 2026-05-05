import os
import json
import base64
import subprocess
import threading

_lock = threading.Lock()
_CONFIG_LOADED = False
_pygeoapi_app = None

CONFIG_PATH = os.environ.get("PYGEOAPI_CONFIG", "/pygeoapi/local.config.yml")
_TASKS_FLAG = "/tmp/waystones_tasks_triggered"


def _inject_machine_env(raw_config_json: str) -> None:
    """Inject machine_env credentials from the X-Waystones-Config JSON into os.environ.

    This is the fallback path for when this.start({ envVars }) in the CF Container
    Durable Object fails to inject environment variables on cold start.
    """
    try:
        payload = json.loads(raw_config_json)
        machine_env = payload.get("machine_env") or {}
        injected = 0
        for k, v in machine_env.items():
            if k not in os.environ or not os.environ[k]:
                os.environ[k] = str(v)
                injected += 1
        if injected:
            print(f"[waystones_wsgi] Injected {injected} env vars from machine_env", flush=True)
    except Exception as e:
        print(f"[waystones_wsgi] Warning: could not parse machine_env: {e}", flush=True)


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
                # Always inject machine_env first so DuckDB/boto3 have R2 credentials
                # before pygeoapi loads, regardless of which config path we take below.
                raw_config = environ.get("HTTP_X_WAYSTONES_CONFIG")
                if raw_config:
                    _inject_machine_env(raw_config)

                # Priority 1: clean base64 header set by containers.ts
                b64 = environ.get("HTTP_X_WAYSTONES_CONFIG_B64")

                # Priority 2: extract pygeoapi_yml from the raw JSON (fallback for
                # when the containers.ts forwarding fix is not yet deployed)
                if not b64 and raw_config:
                    try:
                        b64 = json.loads(raw_config).get("pygeoapi_yml")
                    except Exception:
                        pass

                if b64:
                    # Always write — overrides any base-image demo config on disk.
                    try:
                        config_bytes = base64.b64decode(b64)
                    except Exception:
                        start_response("400 Bad Request", [("Content-Type", "text/plain")])
                        return [b"Invalid config base64."]

                    tmp = CONFIG_PATH + ".tmp"
                    os.makedirs(os.path.dirname(CONFIG_PATH), exist_ok=True)
                    with open(tmp, "wb") as f:
                        f.write(config_bytes)
                    os.replace(tmp, CONFIG_PATH)

                    print(f"[waystones_wsgi] Config written to {CONFIG_PATH}", flush=True)
                    _trigger_background_tasks()

                elif os.path.exists(CONFIG_PATH):
                    # No header but config on disk: worker restarted after SIGHUP,
                    # previous worker already wrote the real config in this container.
                    print(f"[waystones_wsgi] Using existing config at {CONFIG_PATH}", flush=True)

                else:
                    start_response("503 Service Unavailable", [
                        ("Content-Type", "text/plain"),
                        ("Retry-After", "5"),
                    ])
                    return [b"Service initializing. Missing config header."]

                _pygeoapi_app = _load_app()
                _CONFIG_LOADED = True

    return _pygeoapi_app(environ, start_response)
