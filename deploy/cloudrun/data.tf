# The three places that hold state: PostgreSQL, Redis and the uploads bucket.

# --- Cloud SQL for PostgreSQL (replaces the postgres container and its pg_dump cron job) -------------

resource "google_sql_database_instance" "db" {
  project             = var.project_id
  name                = "${var.name_prefix}-db"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = var.db_deletion_protection

  settings {
    tier              = var.db_tier
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 10
    disk_autoresize   = true

    ip_configuration {
      # No public address: only the VPC (and so only the Cloud Run service) can connect.
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "18:00" # UTC, 01:00 in Jakarta
    }
  }

  depends_on = [google_service_networking_connection.psa]
}

resource "google_sql_database" "app" {
  project  = var.project_id
  name     = "elearning"
  instance = google_sql_database_instance.db.name
}

resource "random_password" "db" {
  length  = 32
  special = false
}

resource "google_sql_user" "app" {
  project  = var.project_id
  name     = "elearning"
  instance = google_sql_database_instance.db.name
  password = random_password.db.result
}

# --- Memorystore for Redis (replaces the redis container) --------------------------------------------
# Refresh tokens, login rate limits and, with several instances, the exam event fan-out.

resource "google_redis_instance" "cache" {
  project            = var.project_id
  name               = "${var.name_prefix}-redis"
  region             = var.region
  tier               = "BASIC"
  memory_size_gb     = var.redis_memory_gb
  redis_version      = "REDIS_7_2"
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  auth_enabled       = true

  depends_on = [google_service_networking_connection.psa]
}

# --- Cloud Storage (replaces the backend_storage volume) ---------------------------------------------
# The backend talks to it through the S3-compatible XML API (APP_STORAGE_TYPE=s3) with an HMAC key
# that belongs to a service account which can do nothing but read and write this bucket.

resource "google_storage_bucket" "uploads" {
  project                     = var.project_id
  name                        = "${var.project_id}-${var.name_prefix}-uploads"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = var.uploads_force_destroy

  depends_on = [google_project_service.apis]
}

resource "google_service_account" "storage" {
  project      = var.project_id
  account_id   = "${var.name_prefix}-storage"
  display_name = "E-Learning uploads (HMAC key for the S3-compatible API)"

  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket_iam_member" "storage_uploads" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectUser"
  member = "serviceAccount:${google_service_account.storage.email}"
}

resource "google_storage_hmac_key" "uploads" {
  project               = var.project_id
  service_account_email = google_service_account.storage.email
}
