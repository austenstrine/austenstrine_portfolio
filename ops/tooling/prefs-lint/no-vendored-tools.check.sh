#!/usr/bin/env bash
# C6: extracted tools stay third-party; portfolio keeps thin wrappers only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
fail=0
die_line() { echo "no-vendored-tools: FAIL: $*" >&2; fail=1; }
max_lines() {
	local path=$1 max=$2 n
	[[ -f "$path" ]] || { die_line "missing wrapper $path"; return; }
	n=$(wc -l < "$path")
	if [[ "$n" -gt "$max" ]]; then
		die_line "$path is $n lines (max $max) — looks re-vendored"
	fi
}
max_lines dssh 120
max_lines bin/agent-coord 80
max_lines ops/tooling/env-backup.sh 120
max_lines ops/cdn/ensure-source.sh 80
for p in dssh ops/tooling/env-backup.sh; do
	if [[ -f "$p" ]] && ! grep -qiE 'thin wrapper|Thin wrapper' "$p"; then
		die_line "$p must identify as a thin wrapper"
	fi
done
if [[ -d packages/prisma-seed-migration-sync ]]; then
	die_line "packages/prisma-seed-migration-sync/ present — consume via npm/git dep"
fi
if [[ -f ops/diagnostics/rlog.sh ]]; then
	n=$(wc -l < ops/diagnostics/rlog.sh)
	if [[ "$n" -gt 80 ]]; then
		die_line "ops/diagnostics/rlog.sh is $n lines — do not vendor rlog"
	fi
fi
if git ls-files 'ops/cdn/src/**' 2>/dev/null | grep -q .; then
	die_line "ops/cdn/src is tracked — clone via ensure-source, do not vendor"
fi
if [[ -f apps/api/package.json ]] && grep -qE '"prisma-seed-migration-sync"[[:space:]]*:[[:space:]]*"\*"' apps/api/package.json; then
	die_line "apps/api depends on prisma-seed-migration-sync via workspace *"
fi
[[ $fail -eq 0 ]] || exit 1
echo "no-vendored-tools: ok"
