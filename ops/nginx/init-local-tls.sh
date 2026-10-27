#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cert_dir="$script_dir/certs"
site="local.austenstrine.dev"
cdn="cdn.local.austenstrine.dev"
crt_path="$cert_dir/$site.crt"
key_path="$cert_dir/$site.key"

mkdir -p "$cert_dir"

cert_covers() {
	[[ -f "$crt_path" && -f "$key_path" ]] || return 1
	local text
	text="$(openssl x509 -in "$crt_path" -noout -text 2>/dev/null || true)"
	[[ "$text" == *"$site"* && "$text" == *"$cdn"* ]]
}

if ! cert_covers; then
	rm -f "$crt_path" "$key_path"
	if command -v mkcert >/dev/null 2>&1; then
		mkcert -cert-file "$crt_path" -key-file "$key_path" "$site" "$cdn"
	else
		openssl req -x509 -nodes -newkey rsa:2048 \
			-keyout "$key_path" \
			-out "$crt_path" \
			-days 825 \
			-subj "/CN=$site" \
			-addext "subjectAltName=DNS:$site,DNS:$cdn"
		echo "Created self-signed certificate for $site and $cdn at $cert_dir" >&2
		echo "Install mkcert for a browser-trusted local certificate." >&2
	fi
fi

if ! getent hosts "$cdn" >/dev/null 2>&1 && ! grep -Eq "^[^#]*[[:space:]]$cdn([[:space:]]|$)" /etc/hosts 2>/dev/null; then
	echo "Add this line to /etc/hosts so the local CDN hostname resolves:" >&2
	echo "  127.0.0.1  $cdn" >&2
fi
