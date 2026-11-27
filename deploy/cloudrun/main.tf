# Spring Boot + React e-learning on Cloud Run.
#
#   Browser -> Cloud Run service (one instance = two containers)
#                frontend: Nginx, serves the SPA and proxies /api and /ws to 127.0.0.1:8080
#                backend:  Spring Boot
#              -> Direct VPC egress -> Cloud SQL (private IP) and Memorystore for Redis
#              -> Cloud Storage (S3-compatible API) for uploads
#
# Walkthrough: README.md in this folder.

data "google_project" "this" {
  project_id = var.project_id
}

locals {
  registry = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"

  # Cloud Run's deterministic URL: known before the service exists, so the backend can allow it.
  run_url = "https://${var.service_name}-${data.google_project.this.number}.${var.region}.run.app"

  # The backend treats browser requests as cross-origin (Nginx forwards them as plain HTTP), so every
  # public origin must be listed. Exact origins only: a pattern such as https://*.run.app would also
  # match services in other people's projects.
  cors_origins = distinct(compact(concat(
    [local.run_url, var.domain == "" ? "" : "https://${var.domain}"],
    var.discovered_run_urls,
    var.extra_cors_origins,
  )))
}

resource "google_project_service" "apis" {
  for_each = toset([
    "artifactregistry.googleapis.com",
    "cloudbuild.googleapis.com",
    "compute.googleapis.com",
    "iam.googleapis.com",
    "redis.googleapis.com",
    "run.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
  ])

  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

# Images are built by Cloud Build (deploy.sh) and pulled by Cloud Run.
resource "google_artifact_registry_repository" "app" {
  project       = var.project_id
  location      = var.region
  repository_id = var.name_prefix
  format        = "DOCKER"
  description   = "E-learning backend and frontend images (Cloud Run)"

  depends_on = [google_project_service.apis]
}
