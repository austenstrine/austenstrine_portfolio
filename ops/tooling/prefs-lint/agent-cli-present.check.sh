#!/usr/bin/env bash
# C5 / agent-cli contract: binary exists and orient exits 0.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
[[ -x bin/agent-cli ]] || { echo "agent-cli-present: bin/agent-cli missing or not executable" >&2; exit 1; }
./bin/agent-cli orient >/dev/null
./bin/agent-cli helpers >/dev/null
