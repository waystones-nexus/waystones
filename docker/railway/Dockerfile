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

ENTRYPOINT ["/railway-boot.sh"]
