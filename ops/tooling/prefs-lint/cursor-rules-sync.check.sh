#!/usr/bin/env bash
# Angle D: docs ↔ .cursor/rules mirrors for preference docs agents load.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

fail=0
pair() {
	local doc="$1" rule="$2"
	if [[ ! -f "$doc" ]]; then
		echo "cursor-rules-sync: missing $doc" >&2
		fail=1
		return
	fi
	if [[ ! -f "$rule" ]]; then
		echo "cursor-rules-sync: missing $rule" >&2
		fail=1
		return
	fi
	if ! grep -qF "$doc" "$rule"; then
		echo "cursor-rules-sync: $rule must mention Keep-in-sync target $doc" >&2
		fail=1
	fi
	if ! grep -qF "$rule" "$doc" && ! grep -qF '.cursor/rules/' "$doc"; then
		echo "cursor-rules-sync: $doc should point at Cursor rule mirror" >&2
		fail=1
	fi
}

pair docs/git-commit-preferences.md .cursor/rules/git-commit-preferences.mdc
pair docs/code-style-preferences.md .cursor/rules/code-style-preferences.mdc

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "cursor-rules-sync: ok"
