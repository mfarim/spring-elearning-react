#!/usr/bin/env bash
# Deletes everything the other scripts created, so billing stops. Irreversible: the database, its
# backups and every uploaded file are deleted. Export what you want to keep first.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

echo "This deletes the VM, the Cloud SQL instance (and its backups), both buckets with all files,"
echo "the functions, topics, secrets and service accounts in project $PROJECT_ID."
read -r -p "Type the project id to confirm: " answer
[[ "$answer" == "$PROJECT_ID" ]] || { echo "Aborted."; exit 1; }

# Each delete is allowed to fail (already gone), the script carries on.
try() { "$@" --quiet 2>/dev/null || note "skipped: $*"; }

step "Scheduler and functions"
try gcloud scheduler jobs delete elearning-sql-export --location="$REGION"
for fn in exam-result-mailer upload-inspector sql-export; do
  try gcloud functions delete "$fn" --region="$REGION"
done

step "VM, IP, firewall rules"
try gcloud compute instances delete "$VM_NAME" --zone="$ZONE"
try gcloud compute addresses delete elearning-ip --region="$REGION"
for rule in elearning-allow-web elearning-allow-iap-ssh; do
  try gcloud compute firewall-rules delete "$rule"
done

step "Cloud SQL (deletion protection off first)"
try gcloud sql instances patch "$SQL_INSTANCE" --no-deletion-protection
try gcloud sql instances delete "$SQL_INSTANCE"

step "Buckets, registry, Pub/Sub"
for bucket in "$UPLOADS_BUCKET" "$OPS_BUCKET"; do
  try gcloud storage rm --recursive "gs://$bucket"
done
try gcloud artifacts repositories delete "$AR_REPO" --location="$REGION"
try gcloud pubsub subscriptions delete "${DEAD_LETTER_TOPIC}-sub"
for topic in "$TOPIC" "$DEAD_LETTER_TOPIC"; do
  try gcloud pubsub topics delete "$topic"
done

step "HMAC key, secrets, service accounts, custom role"
for id in $(gcloud storage hmac list --service-account="$STORAGE_SA" --format='value(accessId)' 2>/dev/null); do
  try gcloud storage hmac update "$id" --deactivate
  try gcloud storage hmac delete "$id"
done
for secret in db-password jwt-secret gcs-hmac-access-id gcs-hmac-secret smtp-pass; do
  try gcloud secrets delete "$secret"
done
for sa in "$VM_SA" "$STORAGE_SA" "$MAILER_SA" "$INSPECTOR_SA" "$SQL_EXPORT_SA" "$SCHEDULER_SA"; do
  try gcloud iam service-accounts delete "$sa"
done
try gcloud iam roles delete sqlExporter --project="$PROJECT_ID"

step "Done. To remove the project itself (and anything left in it): gcloud projects delete $PROJECT_ID"
