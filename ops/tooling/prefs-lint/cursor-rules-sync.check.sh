#!/usr/bin/env bash
# Angle D: docs ↔ .cursor/rules mirrors for preference docs agents load.
# Fail-closed on missing files, missing cross-links, and preference-body drift
# after stripping YAML frontmatter + reciprocal Keep-in-sync / Cursor-loads banner lines.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

fail=0

# Normalize preference prose for comparison (stdout).
# Drop whole lines that carry the reciprocal sync banners (avoid matching
# periods inside backtick paths like `.cursor` / `.md`).
preference_body() {
	local path="$1"
	python3 - "$path" <<'PY'
import sys
from pathlib import Path

text = Path(sys.argv[1]).read_text(encoding='utf-8').replace('\r\n', '\n')
if text.startswith('---'):
	end = text.find('\n---', 3)
	if end != -1:
		text = text[end + 4:].lstrip('\n')

out = []
for line in text.splitlines():
	low = line.lower()
	if 'keep in sync with' in low or 'cursor loads' in low:
		continue
	out.append(line)
sys.stdout.write('\n'.join(out).strip() + '\n')
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

	local doc_body rule_body
	doc_body="$(preference_body "$doc")"
	rule_body="$(preference_body "$rule")"
	if [[ "$doc_body" != "$rule_body" ]]; then
		echo "cursor-rules-sync: preference body drift between $doc and $rule (after banner/frontmatter strip)" >&2
		if command -v diff >/dev/null 2>&1; then
			diff -u \
				<(printf '%s' "$doc_body") \
				<(printf '%s' "$rule_body") \
				|& sed -e "1s|.*|--- $doc|" -e "2s|.*|+++ $rule|" \
				>&2 || true
		fi
		fail=1
	fi
}

pair docs/git-commit-preferences.md .cursor/rules/git-commit-preferences.mdc
pair docs/code-style-preferences.md .cursor/rules/code-style-preferences.mdc

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "cursor-rules-sync: ok"
