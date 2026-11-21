#!/usr/bin/env bash
# Keep graphify-out current vs git HEAD (cheap skip when fresh).
# Fail-open when graphify missing (common on cloud VMs).
# Soft-fail on rebuild errors (upstream TypeError Graph>float / extract bugs)
# so post-merge/post-checkout never paint merges red.
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

Rebuild failures soft-exit 0 (warn, leave stamp untouched) so git hooks
never fail the merge/checkout. Re-run with --force after fixing graphifyy.
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

# Soft-fail wrapper: upstream graphifyy rebuild can raise TypeError
# ('>' not supported between instances of 'Graph' and 'float') and similar.
# Capture output; never propagate non-zero to git hooks.
run_rebuild() {
	local cmd=("$@")
	local out rc
	set +e
	out="$("${cmd[@]}" 2>&1)"
	rc=$?
	set -e
	printf '%s\n' "$out"
	if [[ "$rc" -ne 0 ]]; then
		echo "graphify-ensure: warn — rebuild failed (exit $rc); leaving stamp untouched; soft-exit 0" >&2
		# Surface the first TypeError/Rebuild-failed line if present (Activity Log).
		printf '%s\n' "$out" | grep -E "Rebuild failed|TypeError|tree_sitter_sql|not supported between" >&2 || true
		return 0
	fi
	# graphify update can print failure while still exiting 0; treat as soft fail.
	if printf '%s\n' "$out" | grep -Eq "Rebuild failed|Nothing to update or rebuild failed"; then
		echo "graphify-ensure: warn — rebuild reported failure; leaving stamp untouched; soft-exit 0" >&2
		return 0
	fi
	printf '%s\n' "$head_sha" >"$STAMP"
	echo "graphify-ensure: ok (stamped ${head_sha:0:12})"
	return 0
}

if [[ ! -f "$GRAPH" ]]; then
	echo "graphify-ensure: missing graph — extract . --code-only"
	run_rebuild graphify extract . --code-only
else
	echo "graphify-ensure: stale vs HEAD ${head_sha:0:12} — update ."
	run_rebuild graphify update .
fi
