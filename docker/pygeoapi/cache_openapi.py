#!/usr/bin/env python3
import os
import shutil
import subprocess
from urllib.parse import urlparse

OUTPUT_TYPE = os.environ.get("OUTPUT_TYPE", "local").strip().lower()
OUTPUT_URI  = os.environ.get("OUTPUT_URI",  "/data/").strip()
CONFIG      = os.environ.get("PYGEOAPI_CONFIG", "/pygeoapi/local.config.yml")
DEST        = "/pygeoapi/local.openapi.yml"


def generate():
    print("[cache_openapi] Generating openapi.yml...", flush=True)
    with open(DEST, "w") as fh:
        subprocess.run(
            ["pygeoapi", "openapi", "generate", "-c", CONFIG],
            stdout=fh,
            check=True,
        )


if OUTPUT_TYPE == "s3":
    import boto3
    from botocore.exceptions import ClientError

    parsed       = urlparse(OUTPUT_URI)
    bucket       = parsed.netloc
    prefix       = parsed.path.lstrip("/")
    key          = f"{prefix}openapi.yml".lstrip("/")
    endpoint_url = os.environ.get("S3_ENDPOINT") or None

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
    cached = "/data/openapi.yml"
    if os.path.exists(cached):
        shutil.copy(cached, DEST)
        print("[cache_openapi] Copied openapi.yml from local cache.", flush=True)
    else:
        generate()
        os.makedirs("/data", exist_ok=True)
        shutil.copy(DEST, cached)
        print("[cache_openapi] Saved openapi.yml to local cache.", flush=True)
