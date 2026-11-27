output "service_url" {
  description = "Public URL of the application (Cloud Run's deterministic URL)."
  value       = var.image_tag == "" ? "(not deployed yet: run deploy/cloudrun/deploy.sh)" : local.run_url
}

output "custom_domain_url" {
  description = "Custom hostname, once var.domain is set and its DNS records exist."
  value       = var.domain == "" ? null : "https://${var.domain}"
}

output "domain_dns_records" {
  description = "DNS records to create at your DNS provider for var.domain (DNS only, not proxied)."
  value       = try(google_cloud_run_domain_mapping.custom[0].status[0].resource_records, [])
}

output "cors_origins" {
  description = "Origins the backend accepts."
  value       = local.cors_origins
}

output "registry" {
  description = "Artifact Registry path of the images."
  value       = local.registry
}

output "uploads_bucket" {
  value = google_storage_bucket.uploads.name
}

output "sql_instance" {
  value = google_sql_database_instance.db.name
}

output "sql_instance_service_account" {
  description = "Needs roles/storage.objectViewer on a bucket to import SQL files from it (README: demo data)."
  value       = google_sql_database_instance.db.service_account_email_address
}

output "redis_host" {
  value = google_redis_instance.cache.host
}
