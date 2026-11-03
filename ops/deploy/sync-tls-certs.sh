#!/usr/bin/env bash
# Copy Let's Encrypt material into the host path nginx mounts (TLS_CERTS_DIR).
# Idempotent. Safe to re-run from live.sh and from certbot deploy hooks.
set -euo pipefail

CERT_NAME="${TLS_CERT_NAME:-austenstrine.dev}"
LE_LIVE="${TLS_LE_LIVE:-/etc/letsencrypt/live/${CERT_NAME}}"
DEST="${TLS_CERTS_DIR:-/etc/nginx/certs}"
CRT_NAME="${TLS_CERT_FILE:-austenstrine.dev.crt}"
KEY_NAME="${TLS_KEY_FILE:-austenstrine.dev.key}"

if [[ ! -f "${LE_LIVE}/fullchain.pem" || ! -f "${LE_LIVE}/privkey.pem" ]]; then
	echo "sync-tls-certs: missing ${LE_LIVE}/fullchain.pem or privkey.pem" >&2
	exit 1
fi

sudo mkdir -p "$DEST"
sudo cp -L "${LE_LIVE}/fullchain.pem" "${DEST}/${CRT_NAME}"
sudo cp -L "${LE_LIVE}/privkey.pem" "${DEST}/${KEY_NAME}"
sudo chmod 644 "${DEST}/${CRT_NAME}"
sudo chmod 600 "${DEST}/${KEY_NAME}"
# nginx container may run as non-root; keep key group-readable when needed.
sudo chown root:root "${DEST}/${CRT_NAME}" "${DEST}/${KEY_NAME}" || true

echo "sync-tls-certs: wrote ${DEST}/${CRT_NAME} + ${KEY_NAME} from ${LE_LIVE}"
