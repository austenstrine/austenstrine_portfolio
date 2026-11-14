#!/usr/bin/env bash
# C3: tiny-copy fail-closed helper must exist and reject --skip-lint.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HELPER="$DIR/tiny-copy-verify.sh"
[[ -x "$HELPER" ]] || { echo "tiny-copy-verify-present: missing executable $HELPER" >&2; exit 1; }
if out=$("$HELPER" --skip-lint 2>&1); then
	echo "tiny-copy-verify-present: FAIL: --skip-lint must be rejected" >&2
	exit 1
fi
echo "tiny-copy-verify-present: ok"
