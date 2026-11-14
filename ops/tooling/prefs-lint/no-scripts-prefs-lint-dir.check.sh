#!/usr/bin/env bash
# Arbiter lock: process checks live under ops/tooling/prefs-lint only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
if [[ -e "$ROOT/scripts/prefs-lint" ]]; then
	echo "no-scripts-prefs-lint-dir: refuse scripts/prefs-lint (use ops/tooling/prefs-lint)" >&2
	exit 1
fi
