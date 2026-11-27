#!/usr/bin/env bash
# Static IP, firewall, and the Compute Engine VM that runs docker-compose.gcp.yml behind host Nginx.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"

step "Static external IP"
quietly gcloud compute addresses describe elearning-ip --region="$REGION" ||
  gcloud compute addresses create elearning-ip --region="$REGION"
ip="$(gcloud compute addresses describe elearning-ip --region="$REGION" --format='value(address)')"

step "Firewall: 80/443 from anywhere, SSH only through Identity-Aware Proxy"
quietly gcloud compute firewall-rules describe elearning-allow-web ||
  gcloud compute firewall-rules create elearning-allow-web --network=default --direction=INGRESS \
    --action=allow --rules=tcp:80,tcp:443 --source-ranges=0.0.0.0/0 --target-tags=elearning-web
# 35.235.240.0/20 is the range IAP TCP forwarding connects from.
quietly gcloud compute firewall-rules describe elearning-allow-iap-ssh ||
  gcloud compute firewall-rules create elearning-allow-iap-ssh --network=default --direction=INGRESS \
    --action=allow --rules=tcp:22 --source-ranges=35.235.240.0/20 --target-tags=elearning-web
# The default network opens SSH (and RDP) to the whole internet. This project only hosts this app,
# so remove those rules; in a shared project, narrow them instead.
for rule in default-allow-ssh default-allow-rdp; do
  if quietly gcloud compute firewall-rules describe "$rule"; then
    gcloud compute firewall-rules delete "$rule" --quiet
  fi
done

step "VM $VM_NAME ($VM_MACHINE_TYPE, Debian 12) with service account $VM_SA"
if quietly gcloud compute instances describe "$VM_NAME" --zone="$ZONE"; then
  note "VM exists (kept)"
else
  # --scopes=cloud-platform: access is decided by the service account's IAM roles, not by legacy scopes.
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type="$VM_MACHINE_TYPE" \
    --image-family=debian-12 --image-project=debian-cloud \
    --boot-disk-size=20GB --boot-disk-type=pd-balanced \
    --service-account="$VM_SA" --scopes=cloud-platform \
    --tags=elearning-web \
    --address="$ip" \
    --shielded-secure-boot --shielded-vtpm --shielded-integrity-monitoring \
    --metadata=enable-oslogin=TRUE \
    --metadata-from-file=startup-script="$GCP_DIR/vm/bootstrap.sh"
fi

step "Done"
note "Static IP: $ip"
note "1. Create a DNS A record: $DOMAIN -> $ip (DNS only, no proxy, until the certificate is issued)."
note "2. Wait for bootstrap (about 3 minutes):"
note "     gcloud compute ssh $VM_NAME --zone=$ZONE --tunnel-through-iap --command='sudo tail -n 5 /var/log/elearning-bootstrap.log'"
note "3. Run deploy.sh, then certbot.sh."
