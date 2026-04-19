#!/usr/bin/env python3
import os
import shutil
import subprocess
import tempfile
import argparse
import signal
import sys
from urllib.parse import urlparse

# Universal Contract config
OUTPUT_TYPE = os.environ.get("OUTPUT_TYPE", "local").strip().lower()
OUTPUT_URI  = os.environ.get("OUTPUT_URI",  "/data/").strip()
CONFIG      = os.environ.get("PYGEOAPI_CONFIG", "/pygeoapi/local.config.yml")
DEST        = "/pygeoapi/local.openapi.yml"

def generate():
    print("[cache_openapi] Generating openapi.yml...", flush=True)
    dest_dir = os.path.dirname(DEST)
    with tempfile.NamedTemporaryFile(mode="w", dir=dest_dir, delete=False) as tmp:
        tmp_path = tmp.name
        try:
            subprocess.run(
                ["pygeoapi", "openapi", "generate", CONFIG],
                stdout=tmp,
                check=True,
            )
            tmp.flush()
            os.fsync(tmp.fileno())
        except Exception as e:
            print(f"[cache_openapi] Error during generation: {e}", flush=True)
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise
    shutil.move(tmp_path, DEST)

def reload_gunicorn():
    """Trigger a graceful reload of Gunicorn workers (PID 1)."""
    try:
        print("[cache_openapi] Sending SIGHUP to Gunicorn (PID 1)...", flush=True)
        os.kill(1, signal.SIGHUP)
    except Exception as e:
        print(f"[cache_openapi] Warning: Could not signal Gunicorn: {e}", flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--download-only", action="store_true")
    parser.add_argument("--generate-and-reload", action="store_true")
    args = parser.parse_args()

    # Step 1: Handle S3/Cloud storage
    if OUTPUT_TYPE == "s3":
        import boto3
        from botocore.exceptions import ClientError

        parsed       = urlparse(OUTPUT_URI)
        bucket       = parsed.netloc
        prefix       = parsed.path.lstrip("/")
        key = f"{prefix}openapi.yml".lstrip("/")
        endpoint_url = (
            os.environ.get("AWS_ENDPOINT_URL") or 
            os.environ.get("S3_ENDPOINT") or 
            os.environ.get("AWS_S3_ENDPOINT") or 
            None
        )
        if endpoint_url and not endpoint_url.startswith(("http://", "https://")):
            endpoint_url = f"https://{endpoint_url}"

        s3 = boto3.client("s3", endpoint_url=endpoint_url)
        
        try:
            s3.download_file(bucket, key, DEST)
            print(f"[cache_openapi] Downloaded openapi.yml from S3: {bucket}/{key}", flush=True)
            return # Success
        except ClientError as e:
            if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
                if args.download_only:
                    print("[cache_openapi] Cache miss in S3 (download-only). Exiting.", flush=True)
                    sys.exit(0)
                
                # If we get here, we are in generate mode
                generate()
                try:
                    s3.upload_file(DEST, bucket, key)
                    print("[cache_openapi] Uploaded generated openapi.yml to S3.", flush=True)
                except Exception as upload_err:
                    print(f"[cache_openapi] Warning: Could not upload to S3: {upload_err}", flush=True)
                
                if args.generate_and_reload:
                    reload_gunicorn()
            else:
                print(f"[cache_openapi] S3 Error: {e}", flush=True)
                sys.exit(1)

    # Step 2: Handle Local storage
    else:
        cached = os.path.join(OUTPUT_URI.rstrip("/"), "openapi.yml")
        cached_dir = os.path.dirname(cached)

        if os.path.exists(cached):
            shutil.copy(cached, DEST)
            print(f"[cache_openapi] Copied openapi.yml from local cache: {cached}", flush=True)
        else:
            if args.download_only:
                print("[cache_openapi] Local cache miss (download-only). Exiting.", flush=True)
                sys.exit(0)
            
            generate()
            try:
                os.makedirs(cached_dir, exist_ok=True)
                shutil.copy(DEST, cached)
                print(f"[cache_openapi] Saved openapi.yml to local cache: {cached}", flush=True)
            except Exception as cache_err:
                print(f"[cache_openapi] Warning: Local cache save failed: {cache_err}", flush=True)
            
            if args.generate_and_reload:
                reload_gunicorn()

if __name__ == "__main__":
    main()
