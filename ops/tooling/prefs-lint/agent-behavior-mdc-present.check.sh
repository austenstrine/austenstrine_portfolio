#!/usr/bin/env bash
# Angle D: progressive disclosure contract (PEM-488 / docs/cursor-rules-progressive-disclosure.md).
# Always-on: portfolio-essentials + voice-modes. Topic rules exist as intelligent/globs pointers (alwaysApply: false).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

always_on=(
	.cursor/rules/portfolio-essentials.mdc
	.cursor/rules/voice-modes.mdc
)

# Topic rules: present + not always-on (bodies live under docs/ / docs/agent/).
topic=(
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
)

fail=0

if [[ ! -f AGENTS.md ]]; then
	echo "agent-behavior-mdc-present: missing AGENTS.md" >&2
	fail=1
fi

for path in "${always_on[@]}"; do
	if [[ ! -f "$path" ]]; then
		echo "agent-behavior-mdc-present: missing $path" >&2
		fail=1
		continue
	fi
	if ! grep -q '^alwaysApply: true' "$path"; then
		echo "agent-behavior-mdc-present: $path must set alwaysApply: true" >&2
		fail=1
	fi
done

for path in "${topic[@]}"; do
	if [[ ! -f "$path" ]]; then
		echo "agent-behavior-mdc-present: missing $path" >&2
		fail=1
		continue
	fi
	if ! grep -q '^alwaysApply: false' "$path"; then
		echo "agent-behavior-mdc-present: $path must set alwaysApply: false (progressive disclosure)" >&2
		fail=1
	fi
done

if [[ -f AGENTS.md ]]; then
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
	if ! grep -qE 'dssh launch|dssh-launch\.mdc|docs/agent/dssh-launch\.md' AGENTS.md; then
		echo "agent-behavior-mdc-present: AGENTS.md must point at dssh launch / docs/agent/dssh-launch.md" >&2
		fail=1
	fi
	if ! grep -qF 'docs/cursor-rules-progressive-disclosure.md' AGENTS.md; then
		echo "agent-behavior-mdc-present: AGENTS.md must point at docs/cursor-rules-progressive-disclosure.md" >&2
		fail=1
	fi
	for base in portfolio-essentials.mdc voice-modes.mdc; do
		if ! grep -qF "$base" AGENTS.md; then
			echo "agent-behavior-mdc-present: AGENTS.md must point at $base" >&2
			fail=1
		fi
	done
	# Topic discoverability: AGENTS table/docs pointers (docs/agent or preference docs), not every .mdc basename.
	topic_doc_needles=(
		docs/code-style-preferences.md
		docs/git-commit-preferences.md
		docs/agent/graphify.md
		docs/agent/local-first.md
		docs/agent/dssh-launch.md
		docs/agent/dssh-backend-ownership.md
		docs/agent/tiny-copy-doer-adversary.md
		docs/agent/show-dont-tell.md
		docs/agent/viewport-testing.md
		docs/agent/shell-timing-hooks.md
		docs/agent/out-of-scope-handoff.md
		docs/agent/agent-coord.md
		docs/agent/new-chat-on-drift.md
	)
	for needle in "${topic_doc_needles[@]}"; do
		if ! grep -qF "$needle" AGENTS.md; then
			echo "agent-behavior-mdc-present: AGENTS.md must point at $needle" >&2
			fail=1
		fi
	done
fi

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "agent-behavior-mdc-present: ok"
