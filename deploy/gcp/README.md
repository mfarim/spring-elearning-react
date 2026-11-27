# Deploying to Google Cloud

The same Docker Compose setup as the single-VPS deployment, on a Compute Engine VM, with the parts
that hold data moved to managed services:

| On the VPS (`docker-compose.prod.yml`) | On Google Cloud (`docker-compose.gcp.yml`) |
|---|---|
| `postgres` container + cron `pg_dump` | Cloud SQL for PostgreSQL 16 (automated backups, point-in-time recovery), reached through the Cloud SQL Auth Proxy container |
| `backend_storage` volume | Cloud Storage bucket through its S3-compatible API (`APP_STORAGE_TYPE=s3`, HMAC key) |
| `.env` on the server | Secret Manager; `vm/render-env.sh` writes `.env` on the VM with the VM's service account |
| `git pull && docker build` on the server | Cloud Build builds the images, the VM only pulls them from Artifact Registry |
| UFW | VPC firewall: 80/443 open, SSH only through Identity-Aware Proxy |
| `redis` container | unchanged (refresh tokens and rate limits; losing it only logs users out) |
| Host Nginx + Certbot | unchanged |
| — | Cloud Run functions: exam result e-mails (Pub/Sub), upload content checks (Cloud Storage trigger), nightly SQL export (Cloud Scheduler) |

## Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install), logged in: `gcloud auth login`
- A project with billing enabled, and a budget alert on it
- A domain you can add an A record to
- An SMTP account for the e-mails (port 587 or 465; Google Cloud blocks outbound port 25)

## Steps

```bash
cp deploy/gcp/gcp.env.example deploy/gcp/.env.gcp   # fill it in (git-ignored)

deploy/gcp/10-foundation.sh   # APIs, service accounts, registry, buckets, Pub/Sub, secrets
deploy/gcp/20-cloudsql.sh     # Cloud SQL instance, database, user (~10 min)
deploy/gcp/30-vm.sh           # static IP, firewall, VM; prints the IP for your DNS record
deploy/gcp/deploy.sh          # Cloud Build -> Artifact Registry -> docker compose up on the VM
deploy/gcp/certbot.sh         # Let's Encrypt, once DNS points at the VM
deploy/gcp/40-functions.sh    # the three functions, dead-letter topic, scheduler job
```

Every later release is `deploy/gcp/deploy.sh` again. Rollback: `IMAGE_TAG=<older commit> deploy/gcp/deploy.sh --no-build`.

## Moving data from the VPS

```bash
# on the VPS
docker exec elearning-postgres pg_dump -U postgres --no-owner --no-acl elearning | gzip > elearning.sql.gz
# the volume name depends on the compose project (folder) name
volume="$(docker volume ls --format '{{.Name}}' | grep backend_storage)"
docker run --rm -v "$volume":/data -v "$PWD":/out alpine tar czf /out/uploads.tgz -C /data .

# from your laptop (after copying both files over)
gcloud storage cp elearning.sql.gz gs://$PROJECT_ID-ops/migration/
gcloud sql import sql elearning-db gs://$PROJECT_ID-ops/migration/elearning.sql.gz --database=elearning --user=elearning
mkdir uploads && tar xzf uploads.tgz -C uploads && gcloud storage rsync -r uploads gs://$PROJECT_ID-uploads
```

Import before the first `deploy.sh`, or stop the backend while importing: Flyway sees the imported
`flyway_schema_history` and only applies the migrations the VPS did not have yet.

## Tearing down

`deploy/gcp/99-teardown.sh` deletes everything above (asks you to type the project id). Deleting the
whole project (`gcloud projects delete`) is the most thorough option for a demo project.
