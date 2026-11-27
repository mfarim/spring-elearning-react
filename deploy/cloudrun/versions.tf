terraform {
  required_version = ">= 1.6"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 6.20, < 8.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # State is local by default and holds the generated secrets: it is git-ignored, keep it off shared
  # disks. For a team, create a bucket and uncomment:
  # backend "gcs" {
  #   bucket = "YOUR_PROJECT_ID-tfstate"
  #   prefix = "elearning-cloudrun"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
