#!/usr/bin/env bash
# Shared by every script in deploy/gcp: loads .env.gcp, derives resource names, small helpers.
# The scripts are safe to re-run: each step checks whether its resource already exists.
# shellcheck disable=SC2034  # variables are used by the scripts that source this file

set -euo pipefail

GCP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$GCP_DIR/../.." && pwd)"
CONFIG="${GCP_CONFIG:-$GCP_DIR/.env.gcp}"

if [[ ! -f "$CONFIG" ]]; then
  echo "Missing $CONFIG. Copy deploy/gcp/gcp.env.example to deploy/gcp/.env.gcp and fill it in." >&2
  exit 1
fi
set -a
# shellcheck source=/dev/null
source "$CONFIG"
set +a

: "${PROJECT_ID:?}" "${REGION:?}" "${ZONE:?}" "${DOMAIN:?}" "${VM_NAME:?}" "${SQL_INSTANCE:?}" "${SQL_DATABASE:?}" "${SQL_USER:?}" "${AR_REPO:?}"

# Every gcloud call below targets this project, whatever `gcloud config` says.
export CLOUDSDK_CORE_PROJECT="$PROJECT_ID"

UPLOADS_BUCKET="${PROJECT_ID}-uploads"
OPS_BUCKET="${PROJECT_ID}-ops"           # SQL exports and the mailer's dedup markers
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}"
CLOUD_SQL_CONNECTION="${PROJECT_ID}:${REGION}:${SQL_INSTANCE}"
TOPIC="exam-results"
DEAD_LETTER_TOPIC="exam-results-dead-letter"

sa_email() { echo "$1@${PROJECT_ID}.iam.gserviceaccount.com"; }
VM_SA="$(sa_email elearning-vm)"                 # the VM: Cloud SQL client, secrets, registry, Pub/Sub publisher
STORAGE_SA="$(sa_email elearning-storage)"       # owns the HMAC key the backend uses for the uploads bucket
MAILER_SA="$(sa_email fn-exam-result-mailer)"
INSPECTOR_SA="$(sa_email fn-upload-inspector)"
SQL_EXPORT_SA="$(sa_email fn-sql-export)"
SCHEDULER_SA="$(sa_email elearning-scheduler)"

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
note() { printf '    %s\n' "$*"; }
quietly() { "$@" >/dev/null 2>&1; }

ensure_sa() { # name, display name
  quietly gcloud iam service-accounts describe "$(sa_email "$1")" ||
    gcloud iam service-accounts create "$1" --display-name="$2"
}

project_role() { # member, role
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="$1" --role="$2" --condition=None >/dev/null
}

# Secrets live in the region only (user-managed replication), next to the data they protect.
ensure_secret() { # name, value (only used when the secret does not exist yet)
  if ! quietly gcloud secrets describe "$1"; then
    printf '%s' "$2" | gcloud secrets create "$1" --replication-policy=user-managed --locations="$REGION" --data-file=-
  else
    note "secret $1 exists (kept)"
  fi
}

grant_secret() { # secret, service account email
  gcloud secrets add-iam-policy-binding "$1" --member="serviceAccount:$2" --role=roles/secretmanager.secretAccessor >/dev/null
}

project_number() { gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)'; }
