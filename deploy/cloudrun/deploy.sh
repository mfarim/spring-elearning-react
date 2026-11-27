#!/usr/bin/env bash
# Builds the images on Cloud Build and rolls them out to Cloud Run with Terraform. Run from your laptop:
#   deploy/cloudrun/deploy.sh              # build the current commit and deploy it
#   deploy/cloudrun/deploy.sh --yes        # same, without Terraform's confirmation prompt
#   deploy/cloudrun/deploy.sh --plan       # show what Terraform would change; builds and applies nothing
#   IMAGE_TAG=abc1234 deploy/cloudrun/deploy.sh --no-build   # roll back to a tag that already exists
#
# The first run also creates the network, Cloud SQL and Redis: allow 20-30 minutes. Later runs only
# build and replace the Cloud Run revision.
set -euo pipefail

TF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$TF_DIR/../.." && pwd)"

BUILD=true
PLAN_ONLY=false
APPROVE=""
for arg in "$@"; do
  case "$arg" in
    --no-build) BUILD=false ;;
    --plan) PLAN_ONLY=true ;;
    --yes | -y) APPROVE="-auto-approve" ;;
    --help | -h)
      sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg (see --help)" >&2
      exit 1
      ;;
  esac
done

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
note() { printf '    %s\n' "$*"; }
tf() { terraform -chdir="$TF_DIR" "$@"; }
elapsed() { printf '%dm%02ds' $(($1 / 60)) $(($1 % 60)); }

for cmd in gcloud terraform git python3; do
  command -v "$cmd" >/dev/null || { echo "Missing command: $cmd" >&2; exit 1; }
done
if [[ ! -f "$TF_DIR/terraform.tfvars" ]]; then
  echo "Missing $TF_DIR/terraform.tfvars. Copy terraform.tfvars.example and fill it in." >&2
  exit 1
fi

step "Terraform init and validate"
tf init -input=false >/dev/null
tf validate

# Read the settings from Terraform itself, so the script and the stack cannot disagree.
tf_var() { printf 'var.%s\n' "$1" | tf console | tr -d '"'; }
PROJECT_ID="$(tf_var project_id)"
REGION="$(tf_var region)"
NAME_PREFIX="$(tf_var name_prefix)"
SERVICE="$(tf_var service_name)"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${NAME_PREFIX}"
note "project $PROJECT_ID, region $REGION, service $SERVICE"

# Every gcloud call below targets this project, whatever `gcloud config` says.
export CLOUDSDK_CORE_PROJECT="$PROJECT_ID"

if $PLAN_ONLY; then
  tf plan -input=false
  exit 0
fi

START=$SECONDS

if $BUILD; then
  step "APIs and the image registry (needed before the first build)"
  gcloud services enable serviceusage.googleapis.com cloudresourcemanager.googleapis.com --quiet
  tf apply -input=false -auto-approve \
    -target=google_project_service.apis -target=google_artifact_registry_repository.app >/dev/null
  note "registry: $REGISTRY"

  cd "$REPO_ROOT"
  IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
  if [[ -n "$(git status --porcelain -- backend frontend)" ]]; then
    # Without this, a rebuilt image would reuse the commit's tag and Cloud Run would see no change.
    IMAGE_TAG="${IMAGE_TAG}-$(date +%Y%m%d%H%M%S)"
    note "uncommitted changes in backend/ or frontend/ are built in: tag $IMAGE_TAG"
  fi

  step "Cloud Build: backend + frontend -> $REGISTRY (tag $IMAGE_TAG)"
  BUILD_START=$SECONDS
  gcloud builds submit --region="$REGION" --config=deploy/cloudrun/cloudbuild.yaml \
    --substitutions="_REGISTRY=$REGISTRY,_TAG=$IMAGE_TAG" .
  note "build took $(elapsed $((SECONDS - BUILD_START)))"
else
  : "${IMAGE_TAG:?--no-build needs IMAGE_TAG=<existing tag>}"
fi

# Remembered for later plain `terraform apply` runs, which would otherwise remove the service.
printf '{"image_tag": "%s"}\n' "$IMAGE_TAG" >"$TF_DIR/image.auto.tfvars.json"

step "Terraform apply (tag $IMAGE_TAG)"
APPLY_START=$SECONDS
# shellcheck disable=SC2086  # empty or a single flag (kept a plain string: macOS ships bash 3.2)
tf apply -input=false $APPROVE
note "apply took $(elapsed $((SECONDS - APPLY_START)))"

# Cloud Run gives a service a second run.app URL that cannot be computed beforehand. The backend only
# accepts origins it knows, so add any new URL and roll out once more (first deploy only).
step "Checking the service's URLs against the allowed origins"
missing="$(
  gcloud run services describe "$SERVICE" --region="$REGION" --format=json |
    ORIGINS="$(tf output -json cors_origins)" python3 -c '
import json, os, sys
svc = json.load(sys.stdin)
urls = json.loads(svc.get("metadata", {}).get("annotations", {}).get("run.googleapis.com/urls", "[]"))
status_url = svc.get("status", {}).get("url")
if status_url:
    urls.append(status_url)
known = set(json.loads(os.environ["ORIGINS"]))
run_urls = sorted({u.rstrip("/") for u in urls if u.endswith(".run.app")})
if any(u not in known for u in run_urls):
    print(json.dumps({"discovered_run_urls": run_urls}))
'
)"
if [[ -n "$missing" ]]; then
  printf '%s\n' "$missing" >"$TF_DIR/urls.auto.tfvars.json"
  note "new run.app URL found: applying once more so the backend accepts it"
  tf apply -input=false -auto-approve >/dev/null
else
  note "all URLs are allowed"
fi

step "Deployed $IMAGE_TAG in $(elapsed $((SECONDS - START)))"
note "URL:  $(tf output -raw service_url)"
note "Logs: gcloud run services logs read $SERVICE --region=$REGION --project=$PROJECT_ID --limit=50"
