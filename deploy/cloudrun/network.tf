# Private network: Cloud Run reaches the database and Redis over internal IPs only.

resource "google_compute_network" "vpc" {
  project                 = var.project_id
  name                    = "${var.name_prefix}-vpc"
  auto_create_subnetworks = false

  depends_on = [google_project_service.apis]
}

# Cloud Run instances take their addresses from this subnet (Direct VPC egress, no connector VM).
resource "google_compute_subnetwork" "run" {
  project                  = var.project_id
  name                     = "${var.name_prefix}-subnet"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  ip_cidr_range            = "10.10.0.0/24"
  private_ip_google_access = true
}

# Range handed to Google's managed services (Cloud SQL, Memorystore) through private services access.
resource "google_compute_global_address" "psa" {
  project       = var.project_id
  name          = "${var.name_prefix}-psa"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 20
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "psa" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.psa.name]

  # The API often refuses to delete this connection for a while after the last instance is gone.
  # ABANDON lets terraform destroy continue; deleting the VPC removes the peering.
  deletion_policy = "ABANDON"

  depends_on = [google_project_service.apis]
}
