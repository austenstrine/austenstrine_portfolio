#!/usr/bin/env bash
# Subagent stuck-loop watchdog — one-shot classify tick (coordinator / host loop).
# Host forever loop idle-skips (no tick) when no workers. JSON on stdout. Durable metrics under state dir.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${SUBAGENT_WATCHDOG_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/subagent-watchdog}"
CLASSIFY="$ROOT/classify.mjs"

usage() {
	cat <<'EOF'
Usage: watchdog.sh <command> [options]

Commands:
  tick      One poll: classify sample → nudge JSON (default).
  active    Exit 0 if sample has ≥1 active worker; else 1.
  metrics   Print durable counters (ticks / flips / breaches / intervenes).
  reset     Clear worker state (optional --worker ID). Does not wipe metrics.

Options:
  --sample PATH   Worker sample JSON (or "-" stdin). Required for tick/active.
  --state DIR     Override state dir (default: ~/.local/state/subagent-watchdog).
  -h, --help

Host: install-loop.sh (forever, idle-aware). Optional: subscribe_timer 60s while
workers active; unsubscribe when should_poll=false. docs/agent/subagent-watchdog.md
Skill: ~/.agents/skills/watchdog/SKILL.md (./ops/tooling/install-watchdog-skill.sh)
EOF
}

die() { echo "subagent-watchdog: $*" >&2; exit 2; }

CMD=""
SAMPLE=""
RESET_WORKER=""

args=()
while (($#)); do
	case "$1" in
		-h|--help|help) usage; exit 0 ;;
		--sample)
			[[ $# -ge 2 ]] || die "--sample needs PATH"
			SAMPLE="$2"
			shift 2
			;;
		--state)
			[[ $# -ge 2 ]] || die "--state needs DIR"
			STATE_DIR="$2"
			shift 2
			;;
		--worker)
			[[ $# -ge 2 ]] || die "--worker needs ID"
			RESET_WORKER="$2"
			shift 2
			;;
		-*) die "unknown flag: $1" ;;
		*) args+=("$1"); shift ;;
	esac
done

if ((${#args[@]} == 0)); then
	CMD=tick
else
	CMD="${args[0]}"
	if ((${#args[@]} > 1)); then
		die "unexpected args: ${args[*]:1}"
	fi
fi

mkdir -p "$STATE_DIR"
[[ -f "$CLASSIFY" ]] || die "missing classifier: $CLASSIFY"
command -v node >/dev/null 2>&1 || die "node required"

case "$CMD" in
	reset)
		if [[ -n "$RESET_WORKER" ]]; then
			rm -f "$STATE_DIR/worker-${RESET_WORKER}.json"
			echo "{\"ok\":true,\"reset\":\"$RESET_WORKER\",\"state_dir\":\"$STATE_DIR\"}"
		else
			rm -f "$STATE_DIR"/worker-*.json "$STATE_DIR"/last-tick.json
			echo "{\"ok\":true,\"reset\":\"all\",\"state_dir\":\"$STATE_DIR\",\"metrics_kept\":true}"
		fi
		exit 0
		;;
	metrics)
		exec node "$CLASSIFY" metrics --state "$STATE_DIR"
		;;
	active|tick)
		[[ -n "$SAMPLE" ]] || die "need --sample PATH (or - for stdin)"
		exec node "$CLASSIFY" "$CMD" --sample "$SAMPLE" --state "$STATE_DIR"
		;;
	*)
		die "unknown command: $CMD (try --help)"
		;;
esac
