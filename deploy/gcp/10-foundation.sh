#!/usr/bin/env bash
# APIs, service accounts, Artifact Registry, buckets, Pub/Sub topics and the app's own secrets.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Enabling APIs (first run takes a minute or two)"
gcloud services enable \
  compute.googleapis.com sqladmin.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com \
  secretmanager.googleapis.com pubsub.googleapis.com cloudfunctions.googleapis.com run.googleapis.com \
  eventarc.googleapis.com cloudscheduler.googleapis.com iap.googleapis.com logging.googleapis.com \
  monitoring.googleapis.com storage.googleapis.com iam.googleapis.com

step "Service accounts (one per workload, each with only what it needs)"
ensure_sa elearning-vm "E-Learning VM (Docker Compose host)"
ensure_sa elearning-storage "E-Learning uploads (HMAC key for the S3-compatible API)"

for role in roles/cloudsql.client roles/logging.logWriter roles/monitoring.metricWriter; do
  project_role "serviceAccount:$VM_SA" "$role"
done

step "Artifact Registry: $REGISTRY"
quietly gcloud artifacts repositories describe "$AR_REPO" --location="$REGION" ||
  gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION" \
    --description="E-Learning backend and frontend images"
gcloud artifacts repositories add-iam-policy-binding "$AR_REPO" --location="$REGION" \
  --member="serviceAccount:$VM_SA" --role=roles/artifactregistry.reader >/dev/null

step "Buckets: gs://$UPLOADS_BUCKET (uploads), gs://$OPS_BUCKET (exports, dedup markers)"
for bucket in "$UPLOADS_BUCKET" "$OPS_BUCKET"; do
  quietly gcloud storage buckets describe "gs://$bucket" ||
    gcloud storage buckets create "gs://$bucket" --location="$REGION" \
      --uniform-bucket-level-access --public-access-prevention
done
gcloud storage buckets update "gs://$OPS_BUCKET" --lifecycle-file="$GCP_DIR/lifecycle-ops.json"
gcloud storage buckets add-iam-policy-binding "gs://$UPLOADS_BUCKET" \
  --member="serviceAccount:$STORAGE_SA" --role=roles/storage.objectAdmin >/dev/null

step "HMAC key for the backend's S3 client (the secret is shown once: stored straight into Secret Manager)"
if quietly gcloud secrets describe gcs-hmac-access-id; then
  note "HMAC secrets exist (kept)"
else
  hmac_json="$(gcloud storage hmac create "$STORAGE_SA" --format=json)"
  access_id="$(printf '%s' "$hmac_json" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d["metadata"]["accessId"])')"
  secret="$(printf '%s' "$hmac_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["secret"])')"
  ensure_secret gcs-hmac-access-id "$access_id"
  ensure_secret gcs-hmac-secret "$secret"
  unset hmac_json secret
fi

step "Application secrets"
ensure_secret jwt-secret "$(openssl rand -base64 32)"
for secret in gcs-hmac-access-id gcs-hmac-secret jwt-secret; do
  grant_secret "$secret" "$VM_SA"
done

step "Pub/Sub: $TOPIC (+ $DEAD_LETTER_TOPIC)"
for topic in "$TOPIC" "$DEAD_LETTER_TOPIC"; do
  quietly gcloud pubsub topics describe "$topic" || gcloud pubsub topics create "$topic"
done
# Keep dead letters for a week so they can be inspected and replayed.
quietly gcloud pubsub subscriptions describe "${DEAD_LETTER_TOPIC}-sub" ||
  gcloud pubsub subscriptions create "${DEAD_LETTER_TOPIC}-sub" --topic="$DEAD_LETTER_TOPIC" --message-retention-duration=7d
# The VM may publish to this one topic, nothing else.
gcloud pubsub topics add-iam-policy-binding "$TOPIC" \
  --member="serviceAccount:$VM_SA" --role=roles/pubsub.publisher >/dev/null

step "Done. Next: 20-cloudsql.sh"
