#!/usr/bin/env bash
# C5: AGENTS.md prefers ./bin/agent-cli first (binary/orient covered by agent-cli-present.check.sh).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
[[ -f AGENTS.md ]] || { echo "agent-cli-orient: FAIL: AGENTS.md missing" >&2; exit 1; }
if ! grep -qE '\./bin/agent-cli|bin/agent-cli' AGENTS.md; then
	echo "agent-cli-orient: FAIL: AGENTS.md must mention ./bin/agent-cli" >&2
	exit 1
fi
if ! head -n 40 AGENTS.md | grep -qiE 'agent-cli.*(first|orient)|orient.*agent-cli|Run.*agent-cli'; then
	echo "agent-cli-orient: FAIL: AGENTS.md should say use agent-cli first / orient before exploring" >&2
	exit 1
fi
echo "agent-cli-orient: ok"
