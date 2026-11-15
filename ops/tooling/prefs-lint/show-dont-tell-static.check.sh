#!/usr/bin/env bash
# Angle D: static show-don't-tell coaching bans in web/crm UI sources.
# Not an AST duplicate of portfolio-prefs/* — phrase gate only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

PATTERNS="$DIR/show-dont-tell-patterns.txt"
[[ -f "$PATTERNS" ]] || { echo "show-dont-tell-static: missing $PATTERNS" >&2; exit 1; }

# Collect non-comment patterns
mapfile -t patterns < <(grep -vE '^\s*(#|$)' "$PATTERNS" || true)
if ((${#patterns[@]} == 0)); then
	echo "show-dont-tell-static: no patterns in $PATTERNS (fail-closed)" >&2
	exit 1
fi

# Scope: app UI sources only; skip tests and stories
mapfile -t files < <(
	find apps/web/src apps/crm/src \
		\( -name '*.tsx' -o -name '*.ts' -o -name '*.jsx' -o -name '*.js' \) \
		! -name '*.test.*' ! -name '*.spec.*' ! -name '*.stories.*' \
		2>/dev/null | sort
)

if ((${#files[@]} == 0)); then
	echo "show-dont-tell-static: no UI source files found under apps/web|crm (fail-closed)" >&2
	exit 1
fi

fail=0
for pat in "${patterns[@]}"; do
	# ripgrep if present; else grep -E
	if command -v rg >/dev/null 2>&1; then
		hits="$(rg -n -i -e "$pat" "${files[@]}" 2>/dev/null || true)"
	else
		hits="$(grep -n -i -E -e "$pat" "${files[@]}" 2>/dev/null || true)"
	fi
	if [[ -n "$hits" ]]; then
		echo "show-dont-tell-static: coaching pattern /$pat/ hit:" >&2
		echo "$hits" >&2
		fail=1
	fi
done

if [[ "$fail" -ne 0 ]]; then
	echo "show-dont-tell-static: fix the GUI or remove coaching copy (see .cursor/rules/show-dont-tell.mdc)" >&2
	exit 1
fi
echo "show-dont-tell-static: ok"
