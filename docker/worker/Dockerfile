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
    build-essential \
    libsqlite3-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Install tippecanoe (felt/tippecanoe fork) for vector tile generation
RUN curl -L https://github.com/felt/tippecanoe/archive/refs/tags/2.72.0.tar.gz -o /tmp/tippecanoe.tar.gz \
    && tar -xzf /tmp/tippecanoe.tar.gz -C /tmp \
    && cd /tmp/tippecanoe-2.72.0 \
    && make -j$(nproc) \
    && make install \
    && rm -rf /tmp/tippecanoe.tar.gz /tmp/tippecanoe-2.72.0

# Install AWS CLI for `aws s3 cp` uploads
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \
    && unzip /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/awscliv2.zip /tmp/aws

RUN pip install --no-cache-dir duckdb requests boto3

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
