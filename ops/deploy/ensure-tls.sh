#!/usr/bin/env bash
# Ensure Let's Encrypt cert covers live hosts, sync into TLS_CERTS_DIR,
# and install a certbot deploy hook so renewals re-copy automatically.
#
# Default (CERTBOT_AUTH=http): HTTP-01 standalone expand for
#   austenstrine.dev + www + cdn + crm
#   Needs :80 free (live.sh stops host nginx + compose proxy first).
#
# Optional wildcard (CERTBOT_AUTH=dns-namecheap): DNS-01 for
#   austenstrine.dev + *.austenstrine.dev
#   Needs Namecheap API access + credentials file (see docs/aws-cicd-notes.md).
#   Prefer this when the API is already enabled; otherwise keep HTTP-01 + crm SAN.
#
# Idempotent. Safe under live.sh. Needs: certbot, sudo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CERT_NAME="${TLS_CERT_NAME:-austenstrine.dev}"
LE_LIVE="${TLS_LE_LIVE:-/etc/letsencrypt/live/${CERT_NAME}}"
DEST="${TLS_CERTS_DIR:-/etc/nginx/certs}"
SYNC="$ROOT/ops/deploy/sync-tls-certs.sh"
HOOK_DST="/etc/letsencrypt/renewal-hooks/deploy/00-sync-portfolio-certs.sh"
# http (default) | dns-namecheap
AUTH="${CERTBOT_AUTH:-http}"

if [[ "$AUTH" == "dns-namecheap" ]]; then
	# Wildcard covers every subdomain (crm, www, cdn, …). Apex is separate.
	DOMAINS=(austenstrine.dev '*.austenstrine.dev')
else
	DOMAINS=(austenstrine.dev www.austenstrine.dev cdn.austenstrine.dev crm.austenstrine.dev)
fi

# Exit 0 when obtain/expand is required; 1 when the live cert already has every SAN.
need_certbot_domains() {
	local d
	if [[ ! -f "${LE_LIVE}/fullchain.pem" ]]; then
		return 0
	fi
	local sans
	sans="$(sudo openssl x509 -in "${LE_LIVE}/fullchain.pem" -noout -text 2>/dev/null | tr '\n' ' ')"
	for d in "${DOMAINS[@]}"; do
		# openssl text uses DNS:name (wildcard appears as DNS:*.austenstrine.dev)
		if [[ "$sans" != *"DNS:${d}"* ]]; then
			echo "ensure-tls: cert missing SAN ${d}"
			return 0
		fi
	done
	return 1
}

read_certbot_email() {
	local email="${CERTBOT_EMAIL:-}"
	if [[ -z "$email" && -f "$ROOT/.env" ]]; then
		email="$(grep -E '^(CERTBOT_EMAIL|ACME_EMAIL|LETSENCRYPT_EMAIL)=' "$ROOT/.env" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
	fi
	printf '%s' "$email"
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

obtain_http01() {
	local email="$1"
	local domain_args=()
	local d
	for d in "${DOMAINS[@]}"; do
		domain_args+=(-d "$d")
	done

	echo "ensure-tls: obtaining/expanding cert ${CERT_NAME} (HTTP-01 standalone) for: ${DOMAINS[*]}"
	sudo certbot certonly \
		--standalone \
		--non-interactive \
		--agree-tos \
		--email "$email" \
		--cert-name "$CERT_NAME" \
		--expand \
		"${domain_args[@]}"
}

obtain_dns_namecheap() {
	local email="$1"
	local creds="${CERTBOT_DNS_CREDENTIALS:-/etc/letsencrypt/namecheap.ini}"
	local domain_args=()
	local d

	if [[ ! -f "$creds" ]]; then
		echo "ensure-tls: CERTBOT_AUTH=dns-namecheap needs credentials at ${creds}" >&2
		echo "ensure-tls: file format: dns_namecheap_username=… / dns_namecheap_api_key=…" >&2
		echo "ensure-tls: or unset CERTBOT_AUTH to use HTTP-01 + explicit crm SAN" >&2
		exit 1
	fi

	if ! certbot plugins 2>/dev/null | grep -qi 'dns-namecheap\|namecheap'; then
		echo "ensure-tls: certbot dns-namecheap plugin not found." >&2
		echo "ensure-tls: install (e.g. pip install certbot-dns-namecheap) or use CERTBOT_AUTH=http" >&2
		exit 1
	fi

	for d in "${DOMAINS[@]}"; do
		domain_args+=(-d "$d")
	done

	echo "ensure-tls: obtaining/expanding cert ${CERT_NAME} (DNS-01 namecheap wildcard) for: ${DOMAINS[*]}"
	sudo certbot certonly \
		--authenticator dns-namecheap \
		--dns-namecheap-credentials "$creds" \
		--non-interactive \
		--agree-tos \
		--email "$email" \
		--cert-name "$CERT_NAME" \
		--expand \
		"${domain_args[@]}"
}

if [[ ! -x "$SYNC" && ! -f "$SYNC" ]]; then
	echo "ensure-tls: missing ${SYNC}" >&2
	exit 1
fi
chmod +x "$SYNC" || true

if ! command -v certbot >/dev/null 2>&1; then
	echo "ensure-tls: certbot not installed"
	if [[ -f "${DEST}/austenstrine.dev.crt" && -f "${DEST}/austenstrine.dev.key" ]]; then
		# Still refuse soft-continue when we know SANs are incomplete and we
		# cannot expand without certbot.
		if need_certbot_domains; then
			echo "ensure-tls: existing ${DEST} certs miss required SANs and certbot is missing" >&2
			exit 1
		fi
		echo "ensure-tls: existing ${DEST} certs present — continuing without certbot"
		install_renew_hook || true
		exit 0
	fi
	echo "ensure-tls: install certbot (apt install certbot) or place certs in ${DEST}" >&2
	exit 1
fi

if need_certbot_domains; then
	email="$(read_certbot_email)"
	if [[ -z "$email" ]]; then
		echo "ensure-tls: set CERTBOT_EMAIL (env or .env) to obtain/expand the cert" >&2
		echo "ensure-tls: refusing to keep a cert that is missing required SANs (${DOMAINS[*]})" >&2
		exit 1
	fi

	case "$AUTH" in
		http|http-01|standalone)
			obtain_http01 "$email"
			;;
		dns-namecheap|namecheap)
			obtain_dns_namecheap "$email"
			;;
		*)
			echo "ensure-tls: unknown CERTBOT_AUTH=${AUTH} (use http or dns-namecheap)" >&2
			exit 1
			;;
	esac
fi

bash "$SYNC"
install_renew_hook
