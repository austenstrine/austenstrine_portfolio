#!/usr/bin/env bash
# Host keep-alive for subagent stuck-loop watchdog (strategy/budget rules in classify.mjs).
# Poll every INTERVAL_SEC. Prefer sample at $STATE_DIR/sample.json (coordinator drops it);
# else empty workers → should_poll=false heartbeat tick (metrics still advance).
# Softlock stays separate. Fail-open around tick failures.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BIN="${SUBAGENT_WATCHDOG_BIN:-$ROOT/bin/subagent-watchdog}"
STATE_DIR="${SUBAGENT_WATCHDOG_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/subagent-watchdog}"
INTERVAL_SEC="${SUBAGENT_WATCHDOG_INTERVAL_SEC:-60}"
SAMPLE_PATH="${SUBAGENT_WATCHDOG_SAMPLE:-$STATE_DIR/sample.json}"
LOG="${SUBAGENT_WATCHDOG_LOOP_LOG:-$STATE_DIR/loop.log}"

mkdir -p "$STATE_DIR"
touch "$LOG"
echo $$ >"$STATE_DIR/loop.pid"
date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/loop-started-utc.txt"

log() {
	printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG" >/dev/null
}

empty_sample() {
	printf '%s\n' "{\"polled_at\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\",\"workers\":[]}"
}

log "started interval=${INTERVAL_SEC}s state=$STATE_DIR bin=$BIN"

while true; do
	date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/loop-last-utc.txt"
	sample="$SAMPLE_PATH"
	tmp=""
	if [[ ! -f "$sample" ]]; then
		tmp="$(mktemp)"
		empty_sample >"$tmp"
		sample="$tmp"
	fi
	if [[ -x "$BIN" ]]; then
		out="$("$BIN" tick --sample "$sample" --state "$STATE_DIR" 2>&1)" && ok=1 || ok=0
		if [[ "$ok" -eq 1 ]]; then
			should="$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.should_poll));}catch{process.stdout.write("?");}})' 2>/dev/null || echo '?')"
			active="$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.active_workers??0));}catch{process.stdout.write("?");}})' 2>/dev/null || echo '?')"
			log "tick ok active_workers=$active should_poll=$should"
		else
			log "tick fail: $out"
		fi
	else
		log "missing bin: $BIN"
	fi
	[[ -n "$tmp" ]] && rm -f "$tmp"
	sleep "$INTERVAL_SEC"
done
