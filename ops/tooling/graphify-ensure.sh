#!/usr/bin/env bash
# Keep graphify-out current vs git HEAD (cheap skip when fresh).
# Fail-open when graphify missing (common on cloud VMs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

GRAPH="graphify-out/graph.json"
STAMP="graphify-out/.agent_graphify_head"
FORCE=0

usage() {
	cat <<'EOF'
Usage: ops/tooling/graphify-ensure.sh [--force]

Skip when graphify-out matches git HEAD (stamp). Else run graphify update .
(or extract . --code-only if graph missing). No LLM / API key.
EOF
}

for a in "$@"; do
	case "$a" in
		-h|--help|help) usage; exit 0 ;;
		--force) FORCE=1 ;;
		*) echo "graphify-ensure: unknown arg: $a" >&2; exit 2 ;;
	esac
done

if ! command -v graphify >/dev/null 2>&1; then
	echo "graphify-ensure: skip (graphify not on PATH)"
	exit 0
fi

head_sha="$(git rev-parse HEAD 2>/dev/null || true)"
if [[ -z "$head_sha" ]]; then
	echo "graphify-ensure: skip (no git HEAD)"
	exit 0
fi

stale=0
if [[ "$FORCE" -eq 1 ]]; then
	stale=1
elif [[ ! -f "$GRAPH" ]]; then
	stale=1
elif [[ ! -f "$STAMP" ]]; then
	stale=1
elif [[ "$(tr -d '[:space:]' <"$STAMP" 2>/dev/null || true)" != "$head_sha" ]]; then
	stale=1
fi

if [[ "$stale" -eq 0 ]]; then
	echo "graphify-ensure: fresh (HEAD ${head_sha:0:12})"
	exit 0
fi

mkdir -p graphify-out
if [[ ! -f "$GRAPH" ]]; then
	echo "graphify-ensure: missing graph — extract . --code-only"
	graphify extract . --code-only
else
	echo "graphify-ensure: stale vs HEAD ${head_sha:0:12} — update ."
	graphify update .
fi

printf '%s\n' "$head_sha" >"$STAMP"
echo "graphify-ensure: ok (stamped ${head_sha:0:12})"
