#!/usr/bin/env bash
# Startup script of the VM (runs as root on every boot; every step is idempotent).
# Installs Docker Engine + Compose plugin, Nginx and Certbot, adds swap, and lets root pull from
# Artifact Registry with the VM's service account.

set -euo pipefail
exec >>/var/log/elearning-bootstrap.log 2>&1
echo "=== bootstrap $(date -Is)"

export DEBIAN_FRONTEND=noninteractive
REGION="$(curl -s -H 'Metadata-Flavor: Google' http://169.254.169.254/computeMetadata/v1/instance/zone | awk -F/ '{print $NF}' | sed 's/-[a-z]$//')"

if ! command -v docker >/dev/null; then
  apt-get update -q
  apt-get install -y -q ca-certificates curl gnupg
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    >/etc/apt/sources.list.d/docker.list
  apt-get update -q
  apt-get install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

if ! command -v nginx >/dev/null; then
  apt-get install -y -q nginx certbot python3-certbot-nginx
fi

# 2 GB swap: the JVM, Redis and Nginx share 4 GB (same reasoning as on the VPS in Part 4).
if ! swapon --show | grep -q /swapfile; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# docker pull from Artifact Registry as root, using the VM's service account (no key file).
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

install -d -m 0750 /opt/elearning
echo "=== bootstrap done $(date -Is)"
