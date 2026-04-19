#!/usr/bin/env python3
import os
import shutil
import subprocess
import tempfile
from urllib.parse import urlparse

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
        except Exception:
            os.unlink(tmp_path)
            raise
    shutil.move(tmp_path, DEST)


if OUTPUT_TYPE == "s3":
    import boto3
    from botocore.exceptions import ClientError

    parsed       = urlparse(OUTPUT_URI)
    bucket       = parsed.netloc
    prefix       = parsed.path.lstrip("/")
    key          = f"{prefix}openapi.yml".lstrip("/")
    endpoint_url = os.environ.get("S3_ENDPOINT") or os.environ.get("AWS_S3_ENDPOINT") or None
    if endpoint_url and not endpoint_url.startswith(("http://", "https://")):
        endpoint_url = f"https://{endpoint_url}"

    s3 = boto3.client("s3", endpoint_url=endpoint_url)
    try:
        s3.download_file(bucket, key, DEST)
        print("[cache_openapi] Downloaded openapi.yml from S3.", flush=True)
    except ClientError as e:
        if e.response["Error"]["Code"] in ("404", "NoSuchKey"):
            generate()
            s3.upload_file(DEST, bucket, key)
            print("[cache_openapi] Uploaded openapi.yml to S3.", flush=True)
        else:
            raise

else:
    # Respect the Universal Contract by using OUTPUT_URI
    cached = os.path.join(OUTPUT_URI.rstrip("/"), "openapi.yml")
    cached_dir = os.path.dirname(cached)

    if os.path.exists(cached):
        shutil.copy(cached, DEST)
        print(f"[cache_openapi] Copied openapi.yml from local cache ({cached}).", flush=True)
    else:
        generate()
        try:
            # Dynamically create whatever directory the URI specifies
            os.makedirs(cached_dir, exist_ok=True)
            shutil.copy(DEST, cached)
            print(f"[cache_openapi] Saved openapi.yml to local cache ({cached}).", flush=True)
        except PermissionError:
            print(f"[cache_openapi] Warning: Could not write to {cached_dir} due to permissions. Skipping local cache.", flush=True)
