# The Cloud Run service: the frontend and backend containers of docker-compose.prod.yml, side by side
# in every instance. Created once an image tag exists (deploy.sh builds the images first).

locals {
  backend_env = {
    SPRING_DATASOURCE_URL      = "jdbc:postgresql://${google_sql_database_instance.db.private_ip_address}:5432/${google_sql_database.app.name}"
    SPRING_DATASOURCE_USERNAME = google_sql_user.app.name
    # application.yml allows 20 connections per instance; a shared-core Cloud SQL instance has 25 in total.
    SPRING_DATASOURCE_HIKARI_MAXIMUMPOOLSIZE = tostring(var.db_pool_size)
    SPRING_DATASOURCE_HIKARI_MINIMUMIDLE     = "1"

    SPRING_DATA_REDIS_HOST = google_redis_instance.cache.host
    SPRING_DATA_REDIS_PORT = tostring(google_redis_instance.cache.port)

    # Several instances: shared rate limits, exam events relayed through Redis, uploads in a bucket.
    APP_RATE_LIMIT_STORE      = "redis"
    APP_REALTIME_MODE         = "redis"
    APP_STORAGE_TYPE          = "s3"
    APP_STORAGE_S3_ENDPOINT   = "https://storage.googleapis.com"
    APP_STORAGE_S3_REGION     = "auto"
    APP_STORAGE_S3_PATH_STYLE = "true"
    APP_STORAGE_S3_BUCKET     = google_storage_bucket.uploads.name
    APP_STORAGE_S3_ACCESS_KEY = google_storage_hmac_key.uploads.access_id

    APP_CORS_ALLOWED_ORIGINS = join(",", local.cors_origins)
    APP_DEMO_MODE            = tostring(var.demo_mode)
    APP_REGISTRATION_ENABLED = "false"
    SPRINGDOC_ENABLED        = "false"
    LOG_LEVEL_APP            = "INFO"

    # The JVM sizes its heap from the container's memory limit.
    JAVA_TOOL_OPTIONS = "-XX:MaxRAMPercentage=70"
  }

  # Environment variable -> key in local.secret_names
  backend_secret_env = {
    JWT_SECRET                 = "jwt-secret"
    SPRING_DATASOURCE_PASSWORD = "db-password"
    SPRING_DATA_REDIS_PASSWORD = "redis-auth"
    APP_STORAGE_S3_SECRET_KEY  = "storage-hmac-secret"
  }
}

resource "google_cloud_run_v2_service" "app" {
  count = var.image_tag == "" ? 0 : 1

  project             = var.project_id
  name                = var.service_name
  location            = var.region
  ingress             = "INGRESS_TRAFFIC_ALL"
  deletion_protection = false

  template {
    service_account = google_service_account.run.email

    # WebSocket connections (exam monitoring) are requests too: 60 minutes is Cloud Run's maximum.
    # The STOMP client reconnects after that.
    timeout = "3600s"
    # Keeps a browser on the same instance while it is up (best effort), which WebSockets like.
    session_affinity                 = true
    max_instance_request_concurrency = 80

    scaling {
      min_instance_count = var.min_instances
      max_instance_count = var.max_instances
    }

    # Direct VPC egress: private addresses (Cloud SQL, Redis) go through the VPC, everything else
    # (Cloud Storage, Secret Manager) takes the normal path.
    vpc_access {
      egress = "PRIVATE_RANGES_ONLY"
      network_interfaces {
        network    = google_compute_network.vpc.id
        subnetwork = google_compute_subnetwork.run.id
      }
    }

    # Ingress container: the only one with a port. Same image as on the VPS; BACKEND_UPSTREAM points
    # Nginx at the backend container, which shares localhost with it.
    containers {
      name       = "frontend"
      image      = "${local.registry}/frontend:${var.image_tag}"
      depends_on = ["backend"]

      ports {
        container_port = 80
      }

      env {
        name  = "BACKEND_UPSTREAM"
        value = "127.0.0.1:8080"
      }

      resources {
        limits = {
          cpu    = "500m"
          memory = "256Mi"
        }
        cpu_idle = !var.cpu_always_allocated
      }

      startup_probe {
        period_seconds    = 2
        timeout_seconds   = 1
        failure_threshold = 30
        tcp_socket {
          port = 80
        }
      }
    }

    containers {
      name  = "backend"
      image = "${local.registry}/backend:${var.image_tag}"

      dynamic "env" {
        for_each = local.backend_env
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = local.backend_secret_env
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.app[env.value].secret_id
              version = "latest"
            }
          }
        }
      }

      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
        cpu_idle          = !var.cpu_always_allocated
        startup_cpu_boost = true
      }

      # Ready = Spring context up, Flyway migrations applied. Up to ~4 minutes for a first start.
      startup_probe {
        initial_delay_seconds = 5
        period_seconds        = 5
        timeout_seconds       = 3
        failure_threshold     = 48
        http_get {
          path = "/actuator/health/readiness"
          port = 8080
        }
      }

      liveness_probe {
        period_seconds    = 30
        timeout_seconds   = 5
        failure_threshold = 3
        http_get {
          path = "/actuator/health/liveness"
          port = 8080
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_version.app,
    google_secret_manager_secret_iam_member.run,
    google_storage_bucket_iam_member.storage_uploads,
  ]
}

# Public website: anyone may call the service. The application does its own authentication.
resource "google_cloud_run_v2_service_iam_member" "public" {
  count = var.image_tag == "" ? 0 : 1

  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.app[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# Optional custom hostname. Domain mappings are a Preview feature that Google does not recommend for
# production (added latency); the supported alternative is a global external Application Load Balancer.
# The domain must be verified for your account first: see README.md.
resource "google_cloud_run_domain_mapping" "custom" {
  count = var.domain != "" && var.image_tag != "" ? 1 : 0

  project  = var.project_id
  location = var.region
  name     = var.domain

  metadata {
    namespace = var.project_id
  }

  spec {
    route_name = google_cloud_run_v2_service.app[0].name
  }
}
