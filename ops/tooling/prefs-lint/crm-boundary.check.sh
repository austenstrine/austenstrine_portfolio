#!/usr/bin/env bash
# arch.crm-separate: apps/web must not import apps/crm and vice versa.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
if git grep -n "apps/crm" -- 'apps/web/src' 2>/dev/null | grep -iE 'import|require|from ' >/dev/null; then
	git grep -n "apps/crm" -- 'apps/web/src' | grep -iE 'import|require|from ' >&2 || true
	echo "crm-boundary: FAIL: apps/web references apps/crm" >&2
	fail=1
fi
if git grep -n "apps/web" -- 'apps/crm/src' 2>/dev/null | grep -iE 'import|require|from ' >/dev/null; then
	git grep -n "apps/web" -- 'apps/crm/src' | grep -iE 'import|require|from ' >&2 || true
	echo "crm-boundary: FAIL: apps/crm references apps/web" >&2
	fail=1
fi
[[ $fail -eq 0 ]] || exit 1
echo "crm-boundary: ok"
