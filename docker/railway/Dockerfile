FROM ghcr.io/henrik716/waystones-keystone:pygeoapi-latest

USER root

# 1. Prevent apt-get from hanging on interactive prompts (like tzdata)
ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies for the worker
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libpq5 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# 2. Install AWS CLI (added -q to unzip to prevent log-choking)
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \
    && unzip -q /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/awscliv2.zip /tmp/aws

WORKDIR /app

# Direct COPY is faster and more reliable than the 'COPY .' sync logic.
# These folders are part of the well-defined Deployment Kit structure.
COPY docker/worker/*.py /app/worker/
COPY docker/railway/railway-boot.sh /railway-boot.sh
RUN chmod +x /railway-boot.sh

# Templates aligned with the export process (entry-point.ts)
COPY docker/pygeoapi/html-templates/ /pygeoapi/local-templates/

# Configuration
COPY model.json /app/model.json
COPY pygeoapi-config.yml /pygeoapi/local.config.yml

# We only use the build context sync for the optional data folder to keep it fast.
COPY . /tmp/build-context
RUN mkdir -p /data /app/data-sync && \
    if [ -d /tmp/build-context/data ]; then \
        cp -r /tmp/build-context/data/* /app/data-sync/ || true; \
    fi && \
    rm -rf /tmp/build-context

ENTRYPOINT ["/railway-boot.sh"]
