# Secrets are generated here and stored in Secret Manager; Cloud Run injects them as environment
# variables at start-up. Nothing secret is written to terraform.tfvars or the service definition.
# They are in the Terraform state, though: see the note in versions.tf.

resource "random_bytes" "jwt" {
  length = 32 # 256-bit key, Base64-encoded, as JwtProvider expects
}

locals {
  secret_names = toset(["jwt-secret", "db-password", "redis-auth", "storage-hmac-secret"])

  secret_values = {
    "jwt-secret"          = random_bytes.jwt.base64
    "db-password"         = random_password.db.result
    "redis-auth"          = google_redis_instance.cache.auth_string
    "storage-hmac-secret" = google_storage_hmac_key.uploads.secret
  }
}

resource "google_secret_manager_secret" "app" {
  for_each = local.secret_names

  project   = var.project_id
  secret_id = "${var.name_prefix}-${each.key}"

  # Kept in the region only, next to the data they protect.
  replication {
    user_managed {
      replicas {
        location = var.region
      }
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_version" "app" {
  for_each = local.secret_names

  secret      = google_secret_manager_secret.app[each.key].id
  secret_data = local.secret_values[each.key]
}

# Identity of the Cloud Run service. It can read exactly these four secrets and nothing else:
# the database and Redis are reached over the private network, the bucket through the HMAC key.
resource "google_service_account" "run" {
  project      = var.project_id
  account_id   = var.name_prefix
  display_name = "E-Learning Cloud Run service"

  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret_iam_member" "run" {
  for_each = local.secret_names

  project   = var.project_id
  secret_id = google_secret_manager_secret.app[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.run.email}"
}
