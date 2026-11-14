#!/usr/bin/env bash
# Angle D: required alwaysApply agent-behavior rules exist (agents actually load these).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

required=(
	.cursor/rules/agent-coord-async.mdc
	.cursor/rules/code-style-preferences.mdc
	.cursor/rules/dssh-backend-ownership.mdc
	.cursor/rules/dssh-launch.mdc
	.cursor/rules/git-commit-preferences.mdc
	.cursor/rules/graphify.mdc
	.cursor/rules/local-first.mdc
	.cursor/rules/new-chat-on-drift.mdc
	.cursor/rules/out-of-scope-handoff.mdc
	.cursor/rules/shell-timing-hooks.mdc
	.cursor/rules/show-dont-tell.mdc
	.cursor/rules/tiny-copy-doer-adversary.mdc
	.cursor/rules/viewport-testing.mdc
	AGENTS.md
)

fail=0
for path in "${required[@]}"; do
	if [[ ! -f "$path" ]]; then
		echo "agent-behavior-mdc-present: missing $path" >&2
		fail=1
		continue
	fi
	if [[ "$path" =~ ^\.cursor/rules/.+\.mdc$ ]]; then
		if ! grep -q '^alwaysApply: true' "$path"; then
			echo "agent-behavior-mdc-present: $path must set alwaysApply: true" >&2
			fail=1
		fi
	fi
done

if ! grep -q 'bin/agent-cli' AGENTS.md; then
	echo "agent-behavior-mdc-present: AGENTS.md must point at ./bin/agent-cli" >&2
	fail=1
fi
if ! grep -q 'graphify' AGENTS.md; then
	echo "agent-behavior-mdc-present: AGENTS.md must mention graphify" >&2
	fail=1
fi
if ! grep -qE 'local-first|Local-first|sync.*development' AGENTS.md; then
	echo "agent-behavior-mdc-present: AGENTS.md must mention local-first / sync development" >&2
	fail=1
fi
if ! grep -qE 'dssh launch|dssh-launch\.mdc' AGENTS.md; then
	echo "agent-behavior-mdc-present: AGENTS.md must point at dssh launch / dssh-launch.mdc" >&2
	fail=1
fi

# Every required alwaysApply .mdc basename must appear in AGENTS.md (start-here pointers).
for path in "${required[@]}"; do
	if [[ "$path" =~ ^\.cursor/rules/(.+\.mdc)$ ]]; then
		base="${BASH_REMATCH[1]}"
		if ! grep -qF "$base" AGENTS.md; then
			echo "agent-behavior-mdc-present: AGENTS.md must point at $base" >&2
			fail=1
		fi
	fi
done

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "agent-behavior-mdc-present: ok"
