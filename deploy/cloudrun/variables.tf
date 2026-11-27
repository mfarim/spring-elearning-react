variable "project_id" {
  description = "Google Cloud project that holds everything below. Billing must be enabled."
  type        = string
}

variable "region" {
  description = "Region for every resource. Cloud Run domain mappings (var.domain) only exist in some regions; asia-southeast1 is the closest one to Indonesia."
  type        = string
  default     = "asia-southeast1"
}

variable "name_prefix" {
  description = "Prefix for resource names, so this stack can share a project with deploy/gcp (the VM setup)."
  type        = string
  default     = "elearning-run"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,16}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must be 6-18 characters: lowercase letters, digits and hyphens, starting with a letter."
  }
}

variable "service_name" {
  description = "Cloud Run service name. It is part of the run.app URL."
  type        = string
  default     = "elearning"
}

variable "image_tag" {
  description = "Tag of the backend and frontend images in Artifact Registry. deploy.sh writes it to image.auto.tfvars.json after each build. Empty: everything except the Cloud Run service is created."
  type        = string
  default     = ""
}

# --- Public address ---------------------------------------------------------------------------------

variable "domain" {
  description = "Optional custom hostname, e.g. elearning-gcp.example.com. Creates a Cloud Run domain mapping and allows the origin. Leave empty to use the run.app URL only."
  type        = string
  default     = ""
}

variable "extra_cors_origins" {
  description = "More origins the API and the WebSocket endpoint accept, e.g. a local frontend during development."
  type        = list(string)
  default     = []
}

variable "discovered_run_urls" {
  description = "Written by deploy.sh (urls.auto.tfvars.json): run.app URLs Cloud Run assigned to the service that cannot be computed in advance."
  type        = list(string)
  default     = []
}

# --- Cloud Run ---------------------------------------------------------------------------------------

variable "min_instances" {
  description = "0 = scale to zero (cold starts, lowest cost). 1 keeps one instance warm."
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Upper bound for instances. Keep max_instances * db_pool_size below the database's connection limit (db-f1-micro: 25)."
  type        = number
  default     = 3
}

variable "backend_cpu" {
  description = "CPU limit of the Spring Boot container."
  type        = string
  default     = "1000m"
}

variable "backend_memory" {
  description = "Memory limit of the Spring Boot container."
  type        = string
  default     = "1Gi"
}

variable "cpu_always_allocated" {
  description = "false = CPU only while a request is being handled (cheapest). true = instance-based billing; needed if background jobs must run on time, see README (known gaps)."
  type        = bool
  default     = false
}

variable "db_pool_size" {
  description = "HikariCP maximum pool size per instance (application.yml defaults to 20, too many for a shared-core database with several instances)."
  type        = number
  default     = 5
}

variable "demo_mode" {
  description = "APP_DEMO_MODE: true only for a public demo with shared demo accounts."
  type        = bool
  default     = false
}

# --- Data services -----------------------------------------------------------------------------------

variable "db_tier" {
  description = "Cloud SQL machine type. db-f1-micro and db-g1-small are shared-core (cheap, no SLA); db-custom-1-3840 is dedicated."
  type        = string
  default     = "db-f1-micro"
}

variable "db_deletion_protection" {
  description = "Blocks terraform destroy from deleting the database. Set to false (and apply) before tearing the stack down."
  type        = bool
  default     = true
}

variable "redis_memory_gb" {
  description = "Memorystore for Redis size. 1 GB is the minimum and plenty for refresh tokens, rate limits and exam events."
  type        = number
  default     = 1
}

variable "uploads_force_destroy" {
  description = "Lets terraform destroy delete the uploads bucket even when it still holds files."
  type        = bool
  default     = false
}
