#!/usr/bin/env bash
# Angle D: docs ↔ .cursor/rules preference mirrors under progressive disclosure.
# Fail-closed on missing files and missing cross-links.
# Bodies intentionally differ: docs hold full prefs; .mdc files are short pointers
# (see docs/cursor-rules-progressive-disclosure.md). Do not require body identity.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

fail=0

# Pointer stubs must stay short so always-on / glob attach stays cheap.
# Soft cap in UTF-8 bytes (body after optional YAML frontmatter).
MAX_POINTER_BYTES=1200

rule_body_bytes() {
	local path="$1"
	python3 - "$path" <<'PY'
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding='utf-8').replace('\r\n', '\n')
if text.startswith('---'):
	end = text.find('\n---', 3)
	if end != -1:
		text = text[end + 4:].lstrip('\n')
sys.stdout.write(str(len(text.encode('utf-8'))))
PY
}

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

	local nbytes
	nbytes="$(rule_body_bytes "$rule")"
	if [[ "$nbytes" -gt "$MAX_POINTER_BYTES" ]]; then
		echo "cursor-rules-sync: $rule body is ${nbytes}B (max ${MAX_POINTER_BYTES}B) — keep progressive-disclosure pointer short; full prefs live in $doc" >&2
		fail=1
	fi
}

pair docs/git-commit-preferences.md .cursor/rules/git-commit-preferences.mdc
pair docs/code-style-preferences.md .cursor/rules/code-style-preferences.mdc

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "cursor-rules-sync: ok"
