#!/usr/bin/env bash
# Cloud SQL for PostgreSQL 16: automated backups, point-in-time recovery, maintenance window,
# connections only through the Cloud SQL connectors (no authorized networks, client certificates required).
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Cloud SQL instance $SQL_INSTANCE ($SQL_TIER) in $REGION: creating takes ~10 minutes"
if quietly gcloud sql instances describe "$SQL_INSTANCE"; then
  note "instance exists (kept)"
else
  # Times are UTC: backups at 01:00 WIB, maintenance Sunday 02:00 WIB, both outside school hours.
  gcloud sql instances create "$SQL_INSTANCE" \
    --database-version=POSTGRES_16 \
    --edition=ENTERPRISE \
    --tier="$SQL_TIER" \
    --region="$REGION" \
    --storage-type=SSD \
    --storage-size=10GB \
    --storage-auto-increase \
    --backup-start-time=18:00 \
    --enable-point-in-time-recovery \
    --retained-backups-count=7 \
    --retained-transaction-log-days=7 \
    --maintenance-window-day=SUN \
    --maintenance-window-hour=19 \
    --ssl-mode=TRUSTED_CLIENT_CERTIFICATE_REQUIRED \
    --deletion-protection
fi

step "Database and user"
quietly gcloud sql databases describe "$SQL_DATABASE" --instance="$SQL_INSTANCE" ||
  gcloud sql databases create "$SQL_DATABASE" --instance="$SQL_INSTANCE"

if quietly gcloud secrets describe db-password; then
  note "db-password secret exists (user kept)"
else
  password="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-28)"
  gcloud sql users create "$SQL_USER" --instance="$SQL_INSTANCE" --password="$password"
  ensure_secret db-password "$password"
  unset password
fi
grant_secret db-password "$VM_SA"

step "Let Cloud SQL write exports to gs://$OPS_BUCKET (used by the sql-export function)"
sql_sa="$(gcloud sql instances describe "$SQL_INSTANCE" --format='value(serviceAccountEmailAddress)')"
gcloud storage buckets add-iam-policy-binding "gs://$OPS_BUCKET" \
  --member="serviceAccount:$sql_sa" --role=roles/storage.objectAdmin >/dev/null

step "Done. Connection name: $CLOUD_SQL_CONNECTION. Next: 30-vm.sh"
