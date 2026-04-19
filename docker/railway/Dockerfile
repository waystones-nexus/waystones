FROM ghcr.io/henrik716/waystones:pygeoapi-latest

USER root

# Install dependencies for the worker
RUN apt-get update && apt-get install -y --no-install-recommends \
    gdal-bin \
    libgdal-dev \
    libpq5 \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip \
    && unzip /tmp/awscliv2.zip -d /tmp \
    && /tmp/aws/install \
    && rm -rf /tmp/awscliv2.zip /tmp/aws

WORKDIR /app

# COPY the worker scripts from docker/worker/ into this image.
COPY docker/worker/*.py /app/worker/

# COPY a new railway-boot.sh into the image
COPY docker/railway/railway-boot.sh /railway-boot.sh
RUN chmod +x /railway-boot.sh

# Bake in branded HTML templates
COPY docker/pygeoapi/html-templates/ /pygeoapi/local-templates/

# Sync configuration and data from the repo if they exist.
# We bake data into /app/data-sync/ to avoid it being masked by a volume mount at /data/
RUN --mount=type=bind,source=.,target=/build \
    mkdir -p /data /app/data-sync && \
    if [ -f /build/pygeoapi-config.yml ]; then \
        cp /build/pygeoapi-config.yml /pygeoapi/local.config.yml; \
        echo "[build] Config baked in from repo root"; \
    fi && \
    if [ -d /build/data ] && [ "$(ls -A /build/data 2>/dev/null)" ]; then \
        cp -r /build/data/* /app/data-sync/ || true; \
        echo "[build] Data baked into /app/data-sync/"; \
    fi

ENTRYPOINT ["/railway-boot.sh"]
