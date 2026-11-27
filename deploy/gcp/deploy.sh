#!/usr/bin/env bash
# Builds the images on Cloud Build and rolls them out on the VM. Run from your laptop:
#   deploy/gcp/deploy.sh            # build the current commit and deploy it
#   deploy/gcp/deploy.sh --no-build # redeploy an image tag that already exists (IMAGE_TAG=...)
#
# Replaces Part 4's deploy.sh (git pull + docker build on the server): the VM never builds anything.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

cd "$REPO_ROOT"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD)}"
if [[ -n "$(git status --porcelain -- backend frontend)" ]]; then
  note "warning: uncommitted changes in backend/ or frontend/ are built into $IMAGE_TAG"
fi

if [[ "${1:-}" != "--no-build" ]]; then
  step "Cloud Build: backend + frontend -> $REGISTRY (tag $IMAGE_TAG)"
  gcloud builds submit --region="$REGION" --config=deploy/gcp/cloudbuild.yaml \
    --substitutions="_REGISTRY=$REGISTRY,_TAG=$IMAGE_TAG" .
fi

ssh_vm() { gcloud compute ssh "$VM_NAME" --zone="$ZONE" --tunnel-through-iap --command="$1"; }

step "Copying compose file, env script and Nginx config to the VM (SSH through IAP)"
sed "s/__DOMAIN__/$DOMAIN/g" deploy/gcp/vm/nginx-elearning.conf >"/tmp/nginx-elearning.$$.conf"
gcloud compute scp --zone="$ZONE" --tunnel-through-iap \
  docker-compose.gcp.yml deploy/gcp/vm/render-env.sh "/tmp/nginx-elearning.$$.conf" "$VM_NAME:/tmp/"
rm -f "/tmp/nginx-elearning.$$.conf"

step "Rolling out $IMAGE_TAG"
ssh_vm "set -euo pipefail
sudo install -m 0640 /tmp/docker-compose.gcp.yml /opt/elearning/docker-compose.gcp.yml
sudo install -m 0750 /tmp/render-env.sh /opt/elearning/render-env.sh
# Install the HTTP site only the first time: afterwards Certbot owns the file (it adds the TLS block).
if [ ! -f /etc/nginx/sites-available/elearning ]; then
  sudo install -m 0644 /tmp/nginx-elearning.$$.conf /etc/nginx/sites-available/elearning
  sudo ln -sf /etc/nginx/sites-available/elearning /etc/nginx/sites-enabled/elearning
  sudo rm -f /etc/nginx/sites-enabled/default
  sudo nginx -t && sudo systemctl reload nginx
fi
rm -f /tmp/docker-compose.gcp.yml /tmp/render-env.sh /tmp/nginx-elearning.$$.conf
sudo GCP_PROJECT='$PROJECT_ID' DOMAIN='$DOMAIN' REGISTRY='$REGISTRY' IMAGE_TAG='$IMAGE_TAG' \
  CLOUD_SQL_INSTANCE='$CLOUD_SQL_CONNECTION' UPLOADS_BUCKET='$UPLOADS_BUCKET' \
  POSTGRES_DB='$SQL_DATABASE' POSTGRES_USER='$SQL_USER' /opt/elearning/render-env.sh
cd /opt/elearning
sudo docker compose -f docker-compose.gcp.yml pull --quiet
sudo docker compose -f docker-compose.gcp.yml up -d --remove-orphans
sudo docker compose -f docker-compose.gcp.yml ps
sudo docker image prune -f >/dev/null"

step "Deployed $IMAGE_TAG. Health: https://$DOMAIN (after certbot.sh) or the logs:"
note "gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='sudo docker logs --tail 50 elearning-backend'"
