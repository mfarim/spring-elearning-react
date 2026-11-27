# Deploying to Cloud Run

The same two application containers as the single-VPS deployment, running on Cloud Run, with
everything that holds state moved to managed services. Defined in Terraform.

| On the VPS (`docker-compose.prod.yml`) | On Cloud Run (this folder) |
|---|---|
| `frontend` + `backend` containers on one server | One Cloud Run service; every instance runs both containers (Nginx is the ingress container, Spring Boot the sidecar), 0 to `max_instances` instances |
| Host Nginx + Certbot | Cloud Run's HTTPS endpoint (managed certificate) |
| `postgres` container + cron `pg_dump` | Cloud SQL for PostgreSQL 16, private IP only, automated backups and point-in-time recovery |
| `redis` container | Memorystore for Redis 7.2 with AUTH |
| `backend_storage` volume | Cloud Storage bucket through its S3-compatible API (`APP_STORAGE_TYPE=s3`, HMAC key) |
| `.env` on the server | Secret Manager, injected as environment variables |
| `git pull && docker build` on the server | Cloud Build builds the images, Cloud Run pulls them from Artifact Registry |
| UFW | No public IP on the database or Redis: the service reaches them through a VPC (Direct VPC egress) |

`deploy/gcp` is a different setup (one Compute Engine VM running Docker Compose). The two do not
share resources and can live in the same project.

## What changes in the application

Nothing in the Java code. The switches from the scaling work do the job
(`APP_STORAGE_TYPE=s3`, `APP_REALTIME_MODE=redis`, `APP_RATE_LIMIT_STORE=redis`), and the frontend
image reads where the backend is from `BACKEND_UPSTREAM` (default `backend:8080`, so Docker Compose
behaves as before; Cloud Run sets `127.0.0.1:8080`).

## Prerequisites

- [Google Cloud CLI](https://cloud.google.com/sdk/docs/install) and [Terraform](https://developer.hashicorp.com/terraform/install) 1.6 or newer
- A project with billing enabled, and a budget alert on it
- Credentials for both tools:

  ```bash
  gcloud auth login
  gcloud auth application-default login          # Terraform uses these
  gcloud auth application-default set-quota-project YOUR_PROJECT_ID
  ```

## Deploy

```bash
cp deploy/cloudrun/terraform.tfvars.example deploy/cloudrun/terraform.tfvars   # fill in project_id
deploy/cloudrun/deploy.sh --plan    # optional: read what will be created
deploy/cloudrun/deploy.sh           # build, then terraform apply (asks before applying)
```

The first run creates the network, Cloud SQL and Redis and takes 20 to 30 minutes. Every later
release is `deploy/cloudrun/deploy.sh` again; it prints how long the build and the rollout took.
Rollback: `IMAGE_TAG=<older tag> deploy/cloudrun/deploy.sh --no-build`.

The script prints the URL at the end (`https://SERVICE-PROJECT_NUMBER.REGION.run.app`).
Flyway creates the schema on the first start, including the default admin account, which must
change its password on first login (see the main README).

## Custom domain

1. Verify the domain for your Google account (once per domain; a subdomain is covered by its parent):
   `gcloud domains verify example.com`, then add the TXT record it shows.
2. Set `domain = "elearning-gcp.example.com"` in `terraform.tfvars` and run
   `terraform -chdir=deploy/cloudrun apply`. It adds the mapping and a new revision that accepts
   the new origin; the image stays the one from the last `deploy.sh`.
3. Create the record from `terraform -chdir=deploy/cloudrun output domain_dns_records` at your DNS
   provider (a CNAME to `ghs.googlehosted.com.` for a subdomain). On Cloudflare set it to
   **DNS only**: the certificate cannot be issued through the proxy.
4. Wait for the certificate: usually about 15 minutes, up to 24 hours.

Domain mappings are a Preview feature, available in some regions only (`asia-southeast1` is one),
and Google does not recommend them for production because they add latency. For production, put a
global external Application Load Balancer in front of the service instead.

## Demo data

The database has no public address, so `psql` from a laptop cannot reach it. Import through the
Cloud SQL API instead:

```bash
cd deploy/cloudrun
BUCKET="$(terraform output -raw uploads_bucket)"
gcloud storage cp ../../backend/src/main/resources/db/migration/seed_demo_data.sql "gs://$BUCKET/_import/"
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$(terraform output -raw sql_instance_service_account)" --role=roles/storage.objectViewer
gcloud sql import sql "$(terraform output -raw sql_instance)" "gs://$BUCKET/_import/seed_demo_data.sql" \
  --database=elearning --user=elearning
gcloud storage rm "gs://$BUCKET/_import/seed_demo_data.sql"
```

Moving the real data from the VPS works the same way; `deploy/gcp/README.md` has the `pg_dump` and
uploads commands.

## Measuring

```bash
URL="$(terraform -chdir=deploy/cloudrun output -raw service_url)"

# Cold start: wait until no instance is left (about 15 minutes without traffic), then
curl -s -o /dev/null -w 'cold: %{time_total}s\n' "$URL/api/v1/auth/me"
curl -s -o /dev/null -w 'warm: %{time_total}s\n' "$URL/api/v1/auth/me"
```

A `401` is the expected answer: the request went through Nginx to Spring Boot. Instance counts and
request latency are on the service's Metrics tab; cost per service is in Billing > Reports after a
day or two.

## Known gaps

- **Background jobs and CPU throttling.** With `cpu_always_allocated = false`, an instance only gets
  CPU while it handles a request, and with `min_instances = 0` there may be no instance at all. The
  exam finalizer (`app.exam.finalizer`, every 60 s) then runs late: an attempt whose time ran out is
  submitted when the next request arrives. Set `cpu_always_allocated = true` and
  `min_instances = 1` during exams, at a higher price.
- **WebSockets.** A connection ends after 60 minutes at most (Cloud Run's request timeout); the
  STOMP client reconnects. With several instances a browser may reconnect to another one, which is
  why `APP_REALTIME_MODE=redis` is set.
- **Database connections.** `db-f1-micro` allows 25 connections. `max_instances * db_pool_size`
  (default 3 x 5) must stay below that.
- **Client IP for rate limits.** The backend takes the visitor's address from `X-Forwarded-For`,
  as on the VPS. After the first deploy, check a few failed logins in the logs: the IP must be
  yours, not a Google address.
- **Exam result e-mails.** The Pub/Sub outbox and the Cloud Run functions of `deploy/gcp` are not
  part of this stack; `APP_OUTBOX_PUBLISHER` stays at `log`.

## What it costs

Cloud SQL and Memorystore are billed around the clock, whether or not anyone uses the app; Cloud
Run is billed per request-second and falls to zero. At list prices for `us-central1` (other regions
cost more): Memorystore Basic 1 GB about $36 a month, Cloud SQL `db-f1-micro` about $8 plus storage.
Check the [pricing calculator](https://cloud.google.com/products/calculator) for your region.

## Tearing down

```bash
cd deploy/cloudrun
# in terraform.tfvars: db_deletion_protection = false, uploads_force_destroy = true
terraform apply
terraform destroy
```

If `destroy` stops at the private services connection or the network, run it again after a few
minutes. For a demo project, deleting the whole project (`gcloud projects delete`) is the most
thorough option.
