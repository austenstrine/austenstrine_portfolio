#!/usr/bin/env bash
# Expand LE cert with sip.austenstrine.dev SAN (HTTP-01 standalone).
# Brief portfolio-proxy stop while :80 is free — then sync + start proxy.
# Run on live box as ubuntu with sudo. Fail-closed: aborts if DNS A wrong.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOST_IP="${SIP_EXPECT_A:-3.18.37.158}"
EMAIL="${CERTBOT_EMAIL:-}"
CERT_NAME="${TLS_CERT_NAME:-austenstrine.dev}"
LE_LIVE="${TLS_LE_LIVE:-/etc/letsencrypt/live/${CERT_NAME}}"
DEST="${TLS_CERTS_DIR:-/etc/nginx/certs}"
SYNC="$ROOT/ops/deploy/sync-tls-certs.sh"

if [[ -z "$EMAIL" && -f "$ROOT/.env" ]]; then
	EMAIL="$(grep -E '^(CERTBOT_EMAIL|ACME_EMAIL|LETSENCRYPT_EMAIL)=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi
if [[ -z "$EMAIL" ]]; then
	echo "expand-sip-cert: set CERTBOT_EMAIL" >&2
	exit 1
fi

ans="$(getent ahostsv4 sip.austenstrine.dev | awk '{print $1; exit}')"
if [[ "$ans" != "$HOST_IP" ]]; then
	echo "expand-sip-cert: FAIL DNS sip.austenstrine.dev → '${ans}' want ${HOST_IP}" >&2
	exit 1
fi

# Already has SAN?
if sudo openssl x509 -in "${LE_LIVE}/fullchain.pem" -noout -text 2>/dev/null | grep -q 'DNS:sip.austenstrine.dev'; then
	echo "expand-sip-cert: SAN sip.austenstrine.dev already present"
	bash "$SYNC"
	exit 0
fi

echo "expand-sip-cert: stopping portfolio-proxy briefly for HTTP-01…"
docker stop portfolio-proxy

cleanup() {
	docker start portfolio-proxy >/dev/null 2>&1 || sudo docker start portfolio-proxy >/dev/null 2>&1 || true
}
trap cleanup EXIT

sudo certbot certonly \
	--standalone \
	--non-interactive \
	--agree-tos \
	--email "$EMAIL" \
	--cert-name "$CERT_NAME" \
	--expand \
	-d austenstrine.dev \
	-d www.austenstrine.dev \
	-d cdn.austenstrine.dev \
	-d crm.austenstrine.dev \
	-d sip.austenstrine.dev

bash "$SYNC"
trap - EXIT
docker start portfolio-proxy
echo "expand-sip-cert: done; proxy restarted"
curl -sk -o /dev/null -w "health:%{http_code}\n" https://127.0.0.1/api/health || true
