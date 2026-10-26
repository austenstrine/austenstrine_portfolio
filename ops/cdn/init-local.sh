#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
mkdir -p "$script_dir/data/origin" "$script_dir/data/cache"

host="cdn.local.austenstrine.dev"
if ! getent hosts "$host" >/dev/null 2>&1 && ! grep -Eq "^[^#]*[[:space:]]$host([[:space:]]|$)" /etc/hosts 2>/dev/null; then
	echo "Add this line to /etc/hosts so the local CDN hostname resolves:" >&2
	echo "  127.0.0.1  $host" >&2
fi
