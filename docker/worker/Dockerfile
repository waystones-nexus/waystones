# Dockerfile.worker — Ephemeral DuckDB spatial partitioner worker
# Pre-installs DuckDB and all required extensions so no internet access
# is needed at runtime.

FROM python:3.12-slim

# Install GDAL and system deps needed by duckdb spatial + awscli
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libpq5 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI for `aws s3 cp` uploads
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \
    && unzip /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/awscliv2.zip /tmp/aws

RUN pip install --no-cache-dir duckdb

ENV DUCKDB_EXTENSION_DIRECTORY=/duckdb-extensions
RUN mkdir -p /duckdb-extensions && chmod 777 /duckdb-extensions

RUN python3 -c "\
import duckdb; \
con = duckdb.connect(); \
con.execute(\"SET extension_directory='/duckdb-extensions'\"); \
con.execute(\"INSTALL spatial\"); \
con.execute(\"INSTALL httpfs\"); \
con.close(); \
print('DuckDB extensions pre-fetched OK')"

WORKDIR /app

# Bake all worker scripts into the image.
# Build from docker/worker/: docker build -t waystones-worker .
COPY *.py /app/

ENTRYPOINT ["python3", "/app/main.py"]
