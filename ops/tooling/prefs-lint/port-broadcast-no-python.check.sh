#!/usr/bin/env bash
# tools.port-broadcast-no-python: launcher/hop path must stay bash (no python).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
hits=0
for f in bin/port-broadcast-launcher bin/port-broadcast-shell bin/dssh-launch; do
	[[ -f "$f" ]] || continue
	if grep -nE '(^|[[:space:]])python3?([[:space:]]|$)' "$f" >/dev/null 2>&1; then
		# allow comment-only mentions
		if grep -nE '(^|[[:space:]])python3?([[:space:]]|$)' "$f" | grep -vE '^[[:space:]]*#' | grep -vE ':[[:space:]]*#' >/dev/null; then
			grep -nE '(^|[[:space:]])python3?([[:space:]]|$)' "$f" >&2 || true
			echo "port-broadcast-no-python: FAIL in $f" >&2
			hits=$((hits + 1))
		fi
	fi
done
[[ $hits -eq 0 ]] || exit 1
echo "port-broadcast-no-python: ok"
