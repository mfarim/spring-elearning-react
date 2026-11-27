#!/usr/bin/env bash
# Cloud Run functions (deployed with `gcloud functions deploy`, Node.js 22):
#   exam-result-mailer  Pub/Sub exam-results  -> e-mail (SMTP), dead-letter topic after 5 failed deliveries
#   upload-inspector    object finalized in the uploads bucket -> quarantine files whose content lies about their type
#   sql-export          HTTP, called nightly by Cloud Scheduler -> Cloud SQL export to gs://$OPS_BUCKET
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
: "${SMTP_HOST:?}" "${SMTP_PORT:?}" "${SMTP_USER:?}" "${SMTP_FROM:?}"

FUNCTIONS_DIR="$REPO_ROOT/functions"
PROJECT_NUMBER="$(project_number)"
PUBSUB_AGENT="service-${PROJECT_NUMBER}@gcp-sa-pubsub.iam.gserviceaccount.com"

step "Service accounts, one per function"
ensure_sa fn-exam-result-mailer "Function: exam result mailer"
ensure_sa fn-upload-inspector "Function: upload inspector"
ensure_sa fn-sql-export "Function: Cloud SQL export"
ensure_sa elearning-scheduler "Cloud Scheduler: invokes sql-export"

# Mailer: dedup markers in the ops bucket, SMTP password from Secret Manager, receives Eventarc events.
gcloud storage buckets add-iam-policy-binding "gs://$OPS_BUCKET" \
  --member="serviceAccount:$MAILER_SA" --role=roles/storage.objectAdmin >/dev/null
# Inspector: read and move objects in the uploads bucket only.
gcloud storage buckets add-iam-policy-binding "gs://$UPLOADS_BUCKET" \
  --member="serviceAccount:$INSPECTOR_SA" --role=roles/storage.objectAdmin >/dev/null
for sa in "$MAILER_SA" "$INSPECTOR_SA"; do
  project_role "serviceAccount:$sa" roles/eventarc.eventReceiver
done
# sql-export: a custom role with exactly the permissions the export call needs (cloudsql.editor could
# also delete databases and change users).
if ! quietly gcloud iam roles describe sqlExporter --project="$PROJECT_ID"; then
  gcloud iam roles create sqlExporter --project="$PROJECT_ID" --title="Cloud SQL exporter" \
    --permissions=cloudsql.instances.export,cloudsql.instances.get --stage=GA
fi
project_role "serviceAccount:$SQL_EXPORT_SA" "projects/$PROJECT_ID/roles/sqlExporter"

step "SMTP password -> Secret Manager (smtp-pass)"
if quietly gcloud secrets describe smtp-pass; then
  note "smtp-pass exists (kept). Rotate with: gcloud secrets versions add smtp-pass --data-file=-"
else
  read -r -s -p "SMTP password for $SMTP_USER (input hidden): " smtp_pass
  echo
  ensure_secret smtp-pass "$smtp_pass"
  unset smtp_pass
fi
grant_secret smtp-pass "$MAILER_SA"

step "Cloud Storage service agent may publish events (needed by Cloud Storage triggers)"
storage_agent="$(gcloud storage service-agent --project="$PROJECT_ID")"
project_role "serviceAccount:$storage_agent" roles/pubsub.publisher

common=(--gen2 --runtime=nodejs22 --region="$REGION" --memory=256Mi --max-instances=3 --quiet)

step "Deploying exam-result-mailer"
gcloud functions deploy exam-result-mailer "${common[@]}" \
  --source="$FUNCTIONS_DIR/exam-result-mailer" --entry-point=examResultMailer \
  --trigger-topic="$TOPIC" --retry \
  --service-account="$MAILER_SA" --trigger-service-account="$MAILER_SA" \
  --set-env-vars="^|^SMTP_HOST=$SMTP_HOST|SMTP_PORT=$SMTP_PORT|SMTP_USER=$SMTP_USER|SMTP_FROM=$SMTP_FROM|DEDUP_BUCKET=$OPS_BUCKET|APP_URL=https://$DOMAIN" \
  --set-secrets="SMTP_PASS=smtp-pass:latest"

step "Deploying upload-inspector"
gcloud functions deploy upload-inspector "${common[@]}" \
  --source="$FUNCTIONS_DIR/upload-inspector" --entry-point=uploadInspector \
  --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
  --trigger-event-filters="bucket=$UPLOADS_BUCKET" --trigger-location="$REGION" --retry \
  --service-account="$INSPECTOR_SA" --trigger-service-account="$INSPECTOR_SA"

step "Deploying sql-export (private: only the scheduler's service account may call it)"
gcloud functions deploy sql-export "${common[@]}" \
  --source="$FUNCTIONS_DIR/sql-export" --entry-point=sqlExport \
  --trigger-http --no-allow-unauthenticated --timeout=60s \
  --service-account="$SQL_EXPORT_SA" \
  --set-env-vars="GCP_PROJECT=$PROJECT_ID,SQL_INSTANCE=$SQL_INSTANCE,SQL_DATABASE=$SQL_DATABASE,EXPORT_BUCKET=$OPS_BUCKET"

step "Who may invoke what (each function is a Cloud Run service underneath)"
gcloud run services add-iam-policy-binding exam-result-mailer --region="$REGION" \
  --member="serviceAccount:$MAILER_SA" --role=roles/run.invoker >/dev/null
gcloud run services add-iam-policy-binding upload-inspector --region="$REGION" \
  --member="serviceAccount:$INSPECTOR_SA" --role=roles/run.invoker >/dev/null
gcloud run services add-iam-policy-binding sql-export --region="$REGION" \
  --member="serviceAccount:$SCHEDULER_SA" --role=roles/run.invoker >/dev/null

step "Dead-letter policy on the mailer's subscription (created by Eventarc)"
trigger="$(gcloud functions describe exam-result-mailer --region="$REGION" --format='value(eventTrigger.trigger)')"
subscription="$(gcloud eventarc triggers describe "${trigger##*/}" --location="$REGION" --format='value(transport.pubsub.subscription)')"
gcloud pubsub subscriptions update "$subscription" \
  --dead-letter-topic="$DEAD_LETTER_TOPIC" --max-delivery-attempts=5
# Pub/Sub's own service agent moves the message, so it needs both sides of the move.
gcloud pubsub topics add-iam-policy-binding "$DEAD_LETTER_TOPIC" \
  --member="serviceAccount:$PUBSUB_AGENT" --role=roles/pubsub.publisher >/dev/null
gcloud pubsub subscriptions add-iam-policy-binding "$subscription" \
  --member="serviceAccount:$PUBSUB_AGENT" --role=roles/pubsub.subscriber >/dev/null

step "Cloud Scheduler: nightly export at 03:00 WIB (after the 01:00 automated backup)"
url="$(gcloud functions describe sql-export --region="$REGION" --format='value(serviceConfig.uri)')"
if quietly gcloud scheduler jobs describe elearning-sql-export --location="$REGION"; then
  verb=update
else
  verb=create
fi
gcloud scheduler jobs "$verb" http elearning-sql-export --location="$REGION" \
  --schedule="0 3 * * *" --time-zone="Asia/Jakarta" \
  --uri="$url" --http-method=POST \
  --oidc-service-account-email="$SCHEDULER_SA" --oidc-token-audience="$url" \
  --attempt-deadline=120s --max-retry-attempts=3 --min-backoff=10m

step "Done"
note "Try the export now:  gcloud scheduler jobs run elearning-sql-export --location=$REGION"
note "Mailer logs:          gcloud functions logs read exam-result-mailer --region=$REGION --limit=20"
