#!/usr/bin/env bash
# C7: prefs-lint tree must stay LF. Broader repo CRLF cleanup is deferred (historical + peer landings).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

MODE=changed
if [[ "${1:-}" == "--all" ]]; then MODE=all; fi

mapfile -t files < <(
	if [[ "$MODE" == all ]]; then
		git ls-files 'ops/tooling/prefs-lint/**' '.gitattributes'
	else
		base=$(git merge-base HEAD origin/development 2>/dev/null || git merge-base HEAD development 2>/dev/null || true)
		{
			if [[ -n "${base:-}" ]]; then git diff --name-only --diff-filter=ACMR "$base"...HEAD; fi
			git diff --name-only --diff-filter=ACMR --cached
		} | sort -u | while read -r f; do
			case "$f" in
				ops/tooling/prefs-lint/*|.gitattributes) echo "$f" ;;
			esac
		done
	fi
)

hits=0
for f in "${files[@]+"${files[@]}"}"; do
	[[ -n "$f" && -f "$f" ]] || continue
	if python3 -c 'import sys; b=open(sys.argv[1],"rb").read(); sys.exit(0 if b.count(b"\r\n") else 1)' "$f"; then
		echo "eol-check: FAIL: CRLF in $f" >&2
		hits=$((hits + 1))
	fi
done
[[ $hits -eq 0 ]] || exit 1
echo "eol-check: ok"
