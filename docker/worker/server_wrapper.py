from fastapi import FastAPI, Request, BackgroundTasks
import subprocess
import os
import sys
import json
import logging
import time
import urllib.request
import re

# Tippecanoe emits one progress line per tile: "49.0%\t10/585/220"
_TIPPECANOE_PROGRESS = re.compile(r'^\d+\.\d+%\s+\d+/\d+/\d+')
# PostgreSQL connection strings with embedded passwords
_PG_DSN = re.compile(r'(postgresql|postgres)://([^:]+):([^@]+)@')
# S3 / generic secret key patterns
_SECRET_KEY = re.compile(r'(secret[_\-]?(?:access[_\-]?)?key\s*[=:]\s*)\S+', re.IGNORECASE)
# libpq/GDAL conninfo passwords: password=x, password='x y', PGPASSWORD=x
_PASSWORD = re.compile(r"(password\s*[=:]\s*)('(?:[^'\\]|\\.)*'|\S+)", re.IGNORECASE)
# HTTP auth headers echoed in errors
_AUTH_TOKEN = re.compile(r'\b(Bearer|ApiKey)\s+[A-Za-z0-9._~+/=-]+')


# Payload keys that carry DB connection strings or R2 credentials
_SECRET_PAYLOAD_KEYS = {"inputUri", "s3Env", "dataModelB64", "pgConnectionString"}


def redact_payload(payload: dict) -> dict:
    """Copy of a task payload that is safe to log."""
    return {k: ("[redacted]" if k in _SECRET_PAYLOAD_KEYS and v else v) for k, v in payload.items()}


def sanitize(line: str) -> str | None:
    """Return None to drop the line, or a redacted version to keep it."""
    if _TIPPECANOE_PROGRESS.match(line):
        return None
    line = _PG_DSN.sub(r'\1://***:***@', line)
    line = _SECRET_KEY.sub(r'\1***', line)
    line = _PASSWORD.sub(r'\1***', line)
    line = _AUTH_TOKEN.sub(r'\1 ***', line)
    return line

# Configure logging to stdout so it shows up in platform logs
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    stream=sys.stdout
)
logger = logging.getLogger("peon-wrapper")

app = FastAPI(title="Waystones Peon Worker Wrapper")

import threading

# Thread-safe counter for active tasks
active_tasks_lock = threading.Lock()
active_tasks_count = 0

# Grace period before an idle container exits — flushes logs and gives a
# follow-up request a chance to arrive.
SHUTDOWN_GRACE_SECONDS = 20


def delayed_exit(grace_seconds: float = SHUTDOWN_GRACE_SECONDS):
    """Exit after the grace period, unless a task was accepted in the meantime.

    That task's own completion schedules a fresh delayed_exit, so the container
    still shuts down once it is truly idle.
    """
    time.sleep(grace_seconds)
    with active_tasks_lock:
        if active_tasks_count > 0:
            logger.info(f"Task arrived during shutdown grace period ({active_tasks_count} active) — staying up.")
            return
        logger.info("Goodbye!")
        os._exit(0)

class _PostRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if code in (307, 308):
            return urllib.request.Request(newurl, data=req.data, headers=dict(req.headers), method=req.get_method())
        return super().redirect_request(req, fp, code, msg, headers, newurl)

_opener = urllib.request.build_opener(_PostRedirectHandler)


def send_log_lines(lines: list, app_url: str, proj_id: str, secret: str) -> None:
    if not lines or not app_url or not proj_id:
        return
    try:
        import json as _json
        body = _json.dumps({"lines": lines}).encode()
        url = f"{app_url.rstrip('/')}/api/projects/{proj_id}/worker/append-log"
        headers = {"Content-Type": "application/json", "User-Agent": "Waystones-Peon/1.0"}
        if secret:
            headers["Authorization"] = f"Bearer {secret}"
        rq = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with _opener.open(rq, timeout=10):
            pass
    except Exception as e:
        logger.warning(f"Failed to send log lines to cloud: {e}")


def run_task_subprocess(env_vars: dict):
    """
    Runs the main.py script in a subprocess with the provided environment variables.
    """
    global active_tasks_count
    
    with active_tasks_lock:
        active_tasks_count += 1
        
    logger.info(f"--- Starting task execution (Active tasks: {active_tasks_count}) ---")
    
    # Prepare environment
    task_env = os.environ.copy()
    task_env.update({k: str(v) for k, v in env_vars.items() if v is not None})
    task_env["PYTHONUNBUFFERED"] = "1"
    
    # Log the task type and project ID
    task_type = task_env.get("TASK_TYPE", "unknown")
    project_id = task_env.get("PROJECT_ID", "unknown")
    logger.info(f"Task Type: {task_type}, Project ID: {project_id}")
    
    try:
        # Execute main.py
        process = subprocess.Popen(
            [sys.executable, "/app/main.py"],
            env=task_env,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        # Stream logs to stdout and batch-POST to cloud
        app_url = task_env.get("APP_URL", "").strip()
        proj_id = task_env.get("PROJECT_ID", "").strip()
        secret = task_env.get("PEON_CALLBACK_SECRET", "").strip()
        FLUSH_INTERVAL = 3.0
        FLUSH_SIZE = 20
        buffer = []
        last_flush = time.time()

        def flush_buffer():
            nonlocal buffer, last_flush
            if buffer:
                send_log_lines(buffer[:], app_url, proj_id, secret)
                buffer = []
            last_flush = time.time()

        if process.stdout:
            for line in process.stdout:
                clean = sanitize(line.strip())
                if clean is not None:
                    # Container stdout gets the same redacted line as the cloud log
                    print(f"[worker] {clean}", flush=True)
                    ts = time.strftime("%H:%M:%S") + " "
                    buffer.append(ts + clean)
                    if len(buffer) >= FLUSH_SIZE or time.time() - last_flush >= FLUSH_INTERVAL:
                        flush_buffer()

        process.wait()
        flush_buffer()
        
        if process.returncode == 0:
            logger.info(f"--- Task completed successfully (code 0) ---")
        else:
            logger.error(f"--- Task failed with exit code {process.returncode} ---")
            
    except Exception as e:
        logger.exception(f"Unexpected error during task execution: {e}")
    finally:
        with active_tasks_lock:
            active_tasks_count -= 1
            logger.info(f"Task finished. Remaining active tasks: {active_tasks_count}")
            
            if active_tasks_count == 0:
                logger.info(f"No more active tasks. Shutting down in {SHUTDOWN_GRACE_SECONDS}s unless a new task arrives...")
                threading.Thread(target=delayed_exit, daemon=True).start()

@app.post("/internal-task")
async def handle_internal_task(request: Request, background_tasks: BackgroundTasks):
    """
    Receives JSON payload from the Edge Proxy,
    translates it to environment variables, and triggers the worker script.
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Failed to parse JSON body: {e}")
        return {"status": "error", "message": "Invalid JSON body"}, 400

    logger.info(f"Received internal task request: {json.dumps(redact_payload(payload))}")

    # Map payload to environment variables expected by main.py
    # We prioritize the explicit outputUri if provided by the worker proxy
    task_type = payload.get("taskType", "convert")
    
    # Dynamic output target determination logic (as requested)
    output_uri = payload.get("outputUri")
    if not output_uri:
        # Fallback logic if proxy didn't calculate it
        # We assume /layers as default unless it's a specific type
        folder = "layers"
        if task_type in ["tiles", "tile"]:
            folder = "tiles"
        elif task_type == "stac":
            folder = "data"
        output_uri = f"/app/output/{folder}" # Local fallback
        logger.warning(f"outputUri not provided, falling back to: {output_uri}")

    env_vars = {
        "PROJECT_ID": payload.get("projectId"),
        "PROJECT_NAME": payload.get("projectName"),
        "TASK_TYPE": task_type,
        "INPUT_TYPE": payload.get("inputType", "gpkg"),
        "INPUT_URI": payload.get("inputUri") or payload.get("r2ObjectKey"),
        "OUTPUT_TYPE": payload.get("outputType", "s3"),
        "OUTPUT_URI": output_uri,
        "MIN_ZOOM": payload.get("minZoom"),
        "MAX_ZOOM": payload.get("maxZoom"),
        "STRATEGY": payload.get("partitionStrategy"),
        "COLUMN": payload.get("partitionColumn"),
        "MODEL_B64": payload.get("dataModelB64"),
        "FORMAT": payload.get("format", "all"),
        "TABLES": payload.get("tables"),
        "EXCLUDE_ATTRIBUTES": ",".join(payload.get("excludeAttributes") or [])
            if isinstance(payload.get("excludeAttributes"), list)
            else (payload.get("excludeAttributes") or ""),
        "EXCLUDE_LAYERS": ",".join(payload.get("excludeLayerNames") or [])
            if isinstance(payload.get("excludeLayerNames"), list)
            else (payload.get("excludeLayerNames") or ""),
        # [{source, name}] — explicit layer list + MVT layer names for tiling. Passed as
        # JSON in the subprocess env (not the CF container env, which is capped at 5 KB).
        "TILE_LAYERS_JSON": json.dumps(payload["tileLayers"])
            if isinstance(payload.get("tileLayers"), list) and payload["tileLayers"]
            else None,
    }

    # Inject S3 credentials if passed (proxy worker often passes these)
    s3_env = payload.get("s3Env", {})
    if isinstance(s3_env, dict):
        for k, v in s3_env.items():
            env_vars[k] = v

    # Queue the task for background execution
    background_tasks.add_task(run_task_subprocess, env_vars)

    return {
        "status": "accepted",
        "message": f"Task {task_type} for project {payload.get('projectId')} has been queued.",
        "outputTarget": output_uri
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    # Defaulting to 8080 as it's common for Edge Containers
    port = int(os.environ.get("PORT", 8080))
    uvicorn.run(app, host="0.0.0.0", port=port)
