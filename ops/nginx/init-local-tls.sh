#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cert_dir="$script_dir/certs"
domain="local.austenstrine.dssh"
crt_path="$cert_dir/$domain.crt"
key_path="$cert_dir/$domain.key"

mkdir -p "$cert_dir"

if [[ -f "$crt_path" && -f "$key_path" ]]; then
  exit 0
fi

if command -v mkcert >/dev/null 2>&1; then
  mkcert -cert-file "$crt_path" -key-file "$key_path" "$domain"
  exit 0
fi

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout "$key_path" \
  -out "$crt_path" \
  -days 825 \
  -subj "/CN=$domain" \
  -addext "subjectAltName=DNS:$domain"

echo "Created self-signed certificate for $domain at $cert_dir" >&2
echo "Install mkcert for a browser-trusted local certificate." >&2