#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./ops/cdn/purge.sh /pp1_sq_sm.jpg
#   ./ops/cdn/purge.sh --prefix /recommendations/

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
token=""
if [[ -f "$root/.env" ]]; then
	token="$(grep -E '^CDN_TOKEN=' "$root/.env" | tail -n1 | cut -d= -f2- | tr -d '\r')"
fi
token="${token:-${CDN_TOKEN-}}"
url="${CDN_PURGE_URL:-http://127.0.0.1:8088/purge}"

if [[ $# -lt 1 ]]; then
	echo "Usage: $0 <path> | --prefix <prefix>" >&2
	exit 1
fi

if [[ "$1" == "--prefix" ]]; then
	payload=$(printf '{"prefix":%s}' "$(printf '%s' "${2-}" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")))')")
else
	payload=$(printf '{"path":%s}' "$(printf '%s' "$1" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().rstrip("\n")))')")
fi

auth=()
if [[ -n "$token" ]]; then
	auth=(-H "Authorization: Bearer $token")
fi

curl -fsS -X POST "$url" \
	-H "Content-Type: application/json" \
	"${auth[@]}" \
	--data-binary "$payload"
echo
