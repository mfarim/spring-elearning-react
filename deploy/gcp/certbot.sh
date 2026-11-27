#!/usr/bin/env bash
# Issues the Let's Encrypt certificate on the VM (HTTP-01 challenge through host Nginx) and turns on
# the HTTP -> HTTPS redirect. Run once, after the DNS A record points at the VM's static IP.
# Renewal: the certbot package installs a systemd timer; check it with `systemctl list-timers certbot`.
source "$(dirname "${BASH_SOURCE[0]}")/lib.sh"
: "${LETSENCRYPT_EMAIL:?}"

ip="$(gcloud compute addresses describe elearning-ip --region="$REGION" --format='value(address)')"
resolved="$(dig +short "$DOMAIN" A | tail -n1 || true)"
if [[ "$resolved" != "$ip" ]]; then
  echo "$DOMAIN resolves to '${resolved:-nothing}', expected $ip. Fix the DNS record first." >&2
  exit 1
fi

step "Certbot for $DOMAIN"
gcloud compute ssh "$VM_NAME" --zone="$ZONE" --tunnel-through-iap --command="set -euo pipefail
sudo certbot --nginx -d '$DOMAIN' -m '$LETSENCRYPT_EMAIL' --agree-tos --no-eff-email --redirect -n
sudo certbot renew --dry-run
systemctl list-timers certbot.timer --no-pager"

step "Done: https://$DOMAIN"
