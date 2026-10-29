#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cert_dir="$script_dir/certs"
site="local.austenstrine.dev"
local1="local1.austenstrine.dev"
cdn="cdn.local.austenstrine.dev"
crt_path="$cert_dir/$site.crt"
key_path="$cert_dir/$site.key"

mkdir -p "$cert_dir"

cert_covers() {
	[[ -f "$crt_path" && -f "$key_path" ]] || return 1
	local text
	text="$(openssl x509 -in "$crt_path" -noout -text 2>/dev/null || true)"
	[[ "$text" == *"$site"* && "$text" == *"$local1"* && "$text" == *"$cdn"* ]]
}

# Keep the current mkcert CA in user/snap NSS dbs. Chromium snaps do not
# see ~/.pki/nssdb, and a regenerated CA leaves browsers trusting the old one.
trust_mkcert_ca() {
	command -v mkcert >/dev/null 2>&1 || return 0
	command -v certutil >/dev/null 2>&1 || return 0
	local ca
	ca="$(mkcert -CAROOT)/rootCA.pem"
	[[ -f "$ca" ]] || return 0

	TRUST_STORES=nss mkcert -install >/dev/null 2>&1 || true

	local fp nick dir have
	fp="$(openssl x509 -in "$ca" -noout -fingerprint -sha256 | awk -F= '{print $2}')"
	nick="mkcert development CA (dssh)"
	local dbs=(
		"$HOME/.pki/nssdb"
		"$HOME/.local/share/pki/nssdb"
		"$HOME/snap/brave/current/.local/share/pki/nssdb"
		"$HOME/snap/chromium/current/.local/share/pki/nssdb"
	)
	shopt -s nullglob
	for dir in \
		"$HOME/.mozilla/firefox/"*.default* \
		"$HOME/snap/firefox/common/.mozilla/firefox/"*.default*
	do
		dbs+=("$dir")
	done
	shopt -u nullglob

	for dir in "${dbs[@]}"; do
		[[ -f "$dir/cert9.db" ]] || continue
		have="$(
			certutil -d "sql:$dir" -L -n "$nick" -a 2>/dev/null \
				| openssl x509 -noout -fingerprint -sha256 2>/dev/null \
				| awk -F= '{print $2}' || true
		)"
		if [[ "$have" == "$fp" ]]; then
			continue
		fi
		certutil -d "sql:$dir" -D -n "$nick" >/dev/null 2>&1 || true
		if certutil -d "sql:$dir" -A -t "C,," -n "$nick" -i "$ca" >/dev/null 2>&1; then
			echo "Trusted current mkcert CA in $dir" >&2
		fi
	done
}

if ! cert_covers; then
	rm -f "$crt_path" "$key_path"
	if command -v mkcert >/dev/null 2>&1; then
		mkcert -cert-file "$crt_path" -key-file "$key_path" "$site" "$local1" "$cdn"
	else
		openssl req -x509 -nodes -newkey rsa:2048 \
			-keyout "$key_path" \
			-out "$crt_path" \
			-days 825 \
			-subj "/CN=$site" \
			-addext "subjectAltName=DNS:$site,DNS:$local1,DNS:$cdn"
		echo "Created self-signed certificate for $site, $local1, and $cdn at $cert_dir" >&2
		echo "Install mkcert for a browser-trusted local certificate." >&2
	fi
fi

trust_mkcert_ca

for host in "$site" "$local1" "$cdn"; do
	if ! getent hosts "$host" >/dev/null 2>&1 && ! grep -Eq "^[^#]*[[:space:]]$host([[:space:]]|$)" /etc/hosts 2>/dev/null; then
		echo "Add this line to /etc/hosts so the local hostnames resolve:" >&2
		echo "  127.0.0.1  $site $local1 $cdn" >&2
		break
	fi
done
