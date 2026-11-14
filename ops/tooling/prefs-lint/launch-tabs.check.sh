#!/usr/bin/env bash
# dssh.launch-six-tabs: port-broadcast stack conf expects tabs=6.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
conf=""
for c in bin/port-broadcast-stack.conf scripts/port-broadcast-stack.conf; do
	if [[ -f "$c" ]]; then conf=$c; break; fi
done
[[ -n "$conf" ]] || { echo "launch-tabs: FAIL: missing port-broadcast-stack.conf" >&2; exit 1; }
if ! grep -qiE '^[[:space:]]*tabs[[:space:]]*=[[:space:]]*6[[:space:]]*$' "$conf"; then
	echo "launch-tabs: FAIL: $conf must set tabs=6" >&2
	grep -niE 'tabs' "$conf" >&2 || true
	exit 1
fi
echo "launch-tabs: ok"
