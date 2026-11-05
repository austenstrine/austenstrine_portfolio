#!/usr/bin/env bash
# Ensure Let's Encrypt cert covers apex+www+cdn+crm, sync into TLS_CERTS_DIR,
# and install a certbot deploy hook so renewals re-copy automatically.
#
# Idempotent. Safe under live.sh. Needs: certbot, sudo, open :80 for
# standalone obtain/expand (host nginx should already be stopped).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CERT_NAME="${TLS_CERT_NAME:-austenstrine.dev}"
LE_LIVE="${TLS_LE_LIVE:-/etc/letsencrypt/live/${CERT_NAME}}"
DEST="${TLS_CERTS_DIR:-/etc/nginx/certs}"
SYNC="$ROOT/ops/deploy/sync-tls-certs.sh"
HOOK_DST="/etc/letsencrypt/renewal-hooks/deploy/00-sync-portfolio-certs.sh"
DOMAINS=(austenstrine.dev www.austenstrine.dev cdn.austenstrine.dev crm.austenstrine.dev)

# Exit 0 when obtain/expand is required; 1 when the live cert already has every SAN.
need_certbot_domains() {
	local d
	if [[ ! -f "${LE_LIVE}/fullchain.pem" ]]; then
		return 0
	fi
	local sans
	sans="$(sudo openssl x509 -in "${LE_LIVE}/fullchain.pem" -noout -text 2>/dev/null | tr '\n' ' ')"
	for d in "${DOMAINS[@]}"; do
		if [[ "$sans" != *"DNS:${d}"* ]]; then
			echo "ensure-tls: cert missing SAN ${d}"
			return 0
		fi
	done
	return 1
}

install_renew_hook() {
	sudo mkdir -p "$(dirname "$HOOK_DST")"
	sudo tee "$HOOK_DST" >/dev/null <<EOF
#!/usr/bin/env bash
set -euo pipefail
# Re-copy LE material into the nginx bind-mount after every successful renew.
export TLS_CERT_NAME="${CERT_NAME}"
export TLS_LE_LIVE="${LE_LIVE}"
export TLS_CERTS_DIR="${DEST}"
bash ${SYNC@Q}
# Reload compose proxy when it is up (non-fatal if down).
if command -v docker >/dev/null 2>&1; then
	docker exec portfolio-proxy nginx -s reload 2>/dev/null \\
		|| sudo docker exec portfolio-proxy nginx -s reload 2>/dev/null \\
		|| true
fi
EOF
	sudo chmod 755 "$HOOK_DST"
	echo "ensure-tls: installed renew hook ${HOOK_DST}"
}

if [[ ! -x "$SYNC" && ! -f "$SYNC" ]]; then
	echo "ensure-tls: missing ${SYNC}" >&2
	exit 1
fi
chmod +x "$SYNC" || true

if ! command -v certbot >/dev/null 2>&1; then
	echo "ensure-tls: certbot not installed"
	if [[ -f "${DEST}/austenstrine.dev.crt" && -f "${DEST}/austenstrine.dev.key" ]]; then
		echo "ensure-tls: existing ${DEST} certs present — continuing without certbot"
		install_renew_hook || true
		exit 0
	fi
	echo "ensure-tls: install certbot (apt install certbot) or place certs in ${DEST}" >&2
	exit 1
fi

if need_certbot_domains; then
	email="${CERTBOT_EMAIL:-}"
	if [[ -z "$email" ]]; then
		# Prefer CONTACT_EMAIL / ACME email from .env when present.
		if [[ -f "$ROOT/.env" ]]; then
			email="$(grep -E '^(CERTBOT_EMAIL|ACME_EMAIL|LETSENCRYPT_EMAIL)=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
		fi
	fi
	if [[ -z "$email" ]]; then
		echo "ensure-tls: set CERTBOT_EMAIL (env or .env) to obtain/expand the cert" >&2
		if [[ -f "${DEST}/austenstrine.dev.crt" ]]; then
			echo "ensure-tls: keeping existing ${DEST} certs"
			bash "$SYNC" 2>/dev/null || true
			install_renew_hook
			exit 0
		fi
		exit 1
	fi

	domain_args=()
	for d in "${DOMAINS[@]}"; do
		domain_args+=(-d "$d")
	done

	echo "ensure-tls: obtaining/expanding cert ${CERT_NAME} (standalone)"
	sudo certbot certonly \
		--standalone \
		--non-interactive \
		--agree-tos \
		--email "$email" \
		--cert-name "$CERT_NAME" \
		--expand \
		"${domain_args[@]}"
fi

bash "$SYNC"
install_renew_hook
