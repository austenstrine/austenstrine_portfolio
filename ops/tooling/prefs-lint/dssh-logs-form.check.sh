#!/usr/bin/env bash
# dssh.logs-global-form: prefer `dssh logs <target>` over `dssh <target> logs` in docs/rules/scripts.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
# Match `dssh <word> logs` but not `dssh logs <word>`
hits=$(git grep -nE 'dssh[[:space:]]+[a-zA-Z0-9_-]+[[:space:]]+logs' -- \
	'AGENTS.md' 'README.md' 'docs' '.cursor/rules' 'bin' 'ops' ':!ops/tooling/prefs-lint/dssh-logs-form.check.sh' 2>/dev/null || true)
# Filter false positives: comments explaining the ban
bad=0
while IFS= read -r line; do
	[[ -z "$line" ]] && continue
	case "$line" in
		*Prefer\ \`dssh\ logs*|*"not \`dssh <target> logs\`"*|*dssh\ \<target\>\ logs*|*not\ `dssh\ \<t\>\ logs`*) continue ;;
	esac
	# allow lines that say "not dssh X logs" / "Prefer dssh logs"
	if echo "$line" | grep -qiE 'prefer|not |instead|documented form|do not'; then
		continue
	fi
	echo "$line" >&2
	bad=1
done <<< "$hits"
[[ $bad -eq 0 ]] || { echo "dssh-logs-form: FAIL: use \`dssh logs <target>\`" >&2; exit 1; }
echo "dssh-logs-form: ok"
