#!/usr/bin/env bash
# C7: committed/staged text must not introduce CRLF (vs development).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

MODE=changed
if [[ "${1:-}" == "--all" ]]; then MODE=all; fi

text_re='\.(ts|tsx|js|jsx|mjs|cjs|md|mdc|yml|yaml|css|scss|html|sh|bash|prisma|svg|txt)$'

mapfile -t files < <(
	if [[ "$MODE" == all ]]; then
		git ls-files
	else
		base=$(git merge-base HEAD origin/development 2>/dev/null || git merge-base HEAD development 2>/dev/null || true)
		{
			if [[ -n "${base:-}" ]]; then git diff --name-only --diff-filter=ACMR "$base"...HEAD; fi
			git diff --name-only --diff-filter=ACMR --cached
		} | sort -u
	fi
)

hits=0
for f in "${files[@]+"${files[@]}"}"; do
	[[ -n "$f" && -f "$f" ]] || continue
	case "$f" in
		node_modules/*|ops/cdn/src/*|package-lock.json|.cursor/*|.cursor/**) continue ;;
		AGENTS.md|dssh|Dockerfile|Dockerfile.*) ;;
		*)
			[[ "$f" =~ $text_re ]] || continue
			;;
	esac
	if python3 -c 'import sys; b=open(sys.argv[1],"rb").read(); sys.exit(0 if b.count(b"\r\n") else 1)' "$f"; then
		echo "eol-check: FAIL: CRLF in $f" >&2
		hits=$((hits + 1))
	fi
done
[[ $hits -eq 0 ]] || exit 1
echo "eol-check: ok"
