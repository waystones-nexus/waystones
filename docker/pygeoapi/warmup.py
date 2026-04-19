#!/usr/bin/env python3
"""
warmup.py — pre-warm DuckDB connections for all GeoParquet collections.

Launched as a background process by setup-fly.sh before exec'ing the
pygeoapi entrypoint. Waits for pygeoapi to start, then hits each
GeoParquet collection once per gunicorn worker so that DuckDB extension
loading and Parquet footer S3 fetches are already done before the first
real user request arrives.
"""
import os
import time
import urllib.request
import urllib.error
from concurrent.futures import ThreadPoolExecutor

CONFIG_PATH = os.getenv('PYGEOAPI_CONFIG', '/pygeoapi/local.config.yml')
# Internal target for warmup (always localhost:5001 to avoid load balancer hairpinsing)
BASE_URL = 'http://127.0.0.1:5001'
WORKERS = int(os.getenv('CONTAINER_WORKERS', 2))


def wait_for_ready(timeout=60):
    """Wait for pygeoapi to start responding on the internal port."""
    for _ in range(timeout):
        try:
            # specifically target 127.0.0.1 to avoid IPv6 issues or public URL routing
            urllib.request.urlopen(f'{BASE_URL}/', timeout=3)
            return True
        except Exception:
            time.sleep(1)
    return False


def warm_collection(name: str):
    url = f'{BASE_URL}/collections/{name}/items?limit=1'
    try:
        urllib.request.urlopen(url, timeout=120)
        print(f'[warmup] {name} OK', flush=True)
    except Exception as e:
        print(f'[warmup] {name} failed: {e}', flush=True)


def main():
    try:
        import yaml
    except ImportError:
        # PyYAML not available — skip warmup gracefully
        print('[warmup] PyYAML not available, skipping', flush=True)
        return

    print('[warmup] Waiting for pygeoapi...', flush=True)
    if not wait_for_ready():
        print('[warmup] pygeoapi did not start in time, skipping', flush=True)
        return

    # Grace period: pygeoapi just became ready and Fly.io is now dispatching the
    # first queued user request. Wait before warming so warmup doesn't race it.
    warmup_delay = float(os.getenv('WARMUP_DELAY', 5))
    if warmup_delay > 0:
        print(f'[warmup] pygeoapi ready — waiting {warmup_delay}s for first request to clear...', flush=True)
        time.sleep(warmup_delay)

    try:
        with open(CONFIG_PATH) as f:
            config = yaml.safe_load(f)
    except Exception as e:
        print(f'[warmup] Could not read config: {e}', flush=True)
        return

    collections = [
        name
        for name, resource in config.get('resources', {}).items()
        if any(
            'geoparquet' in str(p.get('name', '')).lower()
            for p in resource.get('providers', [])
        )
    ]

    if not collections:
        print('[warmup] No GeoParquet collections found', flush=True)
        return

    # Process warmup requests max_workers=WORKERS at a time to protect the
    # 1-core CPU and leave Gunicorn threads free for concurrent human requests.
    all_targets = collections * WORKERS
    print(f'[warmup] Warming {len(collections)} collection(s) × {WORKERS} workers (paced)...', flush=True)
    with ThreadPoolExecutor(max_workers=WORKERS) as executor:
        list(executor.map(warm_collection, all_targets))

    print('[warmup] Done.', flush=True)


if __name__ == '__main__':
    main()
