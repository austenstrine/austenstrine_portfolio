#!/usr/bin/env bash
# Fail-closed runner for preference process checks (Angle C/D scripts).
# Discovered by: ops/tooling/prefs-lint/*.check.sh
# Invoked from: ./bin/agent-cli lint and npm run lint (via prefs-lint script).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

shopt -s nullglob
checks=("$DIR"/*.check.sh)
if ((${#checks[@]} == 0)); then
	echo "prefs-lint: no *.check.sh under ops/tooling/prefs-lint (fail-closed)" >&2
	exit 1
fi

failed=0
for check in "${checks[@]}"; do
	name="$(basename "$check")"
	echo "prefs-lint: run $name"
	if ! bash "$check"; then
		echo "prefs-lint: FAIL $name" >&2
		failed=1
	fi
done

if [[ "$failed" -ne 0 ]]; then
	echo "prefs-lint: one or more checks failed" >&2
	exit 1
fi

echo "prefs-lint: ok (${#checks[@]} checks)"
