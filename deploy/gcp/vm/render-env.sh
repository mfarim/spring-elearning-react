#!/usr/bin/env bash
# Runs ON the VM (called by deploy.sh). Writes /opt/elearning/.env for docker-compose.gcp.yml.
# Secrets are read from Secret Manager with the VM's own service account, so they never pass
# through the machine that runs the deployment.
#
# Non-secret settings arrive as environment variables from deploy.sh:
#   GCP_PROJECT DOMAIN REGISTRY IMAGE_TAG CLOUD_SQL_INSTANCE UPLOADS_BUCKET POSTGRES_DB POSTGRES_USER

set -euo pipefail
: "${GCP_PROJECT:?}" "${DOMAIN:?}" "${REGISTRY:?}" "${IMAGE_TAG:?}" "${CLOUD_SQL_INSTANCE:?}" "${UPLOADS_BUCKET:?}" "${POSTGRES_DB:?}" "${POSTGRES_USER:?}"

secret() { gcloud secrets versions access latest --secret="$1" --project="$GCP_PROJECT"; }

umask 077
tmp="$(mktemp /opt/elearning/.env.XXXXXX)"
{
  echo "GCP_PROJECT=$GCP_PROJECT"
  echo "DOMAIN=$DOMAIN"
  echo "REGISTRY=$REGISTRY"
  echo "IMAGE_TAG=$IMAGE_TAG"
  echo "CLOUD_SQL_INSTANCE=$CLOUD_SQL_INSTANCE"
  echo "UPLOADS_BUCKET=$UPLOADS_BUCKET"
  echo "POSTGRES_DB=$POSTGRES_DB"
  echo "POSTGRES_USER=$POSTGRES_USER"
  echo "POSTGRES_PASSWORD=$(secret db-password)"
  echo "JWT_SECRET=$(secret jwt-secret)"
  echo "GCS_HMAC_ACCESS_ID=$(secret gcs-hmac-access-id)"
  echo "GCS_HMAC_SECRET=$(secret gcs-hmac-secret)"
} >"$tmp"
mv "$tmp" /opt/elearning/.env
echo "Wrote /opt/elearning/.env (mode 600, image tag $IMAGE_TAG)"
