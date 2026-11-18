#!/usr/bin/env bash
# Host keep-alive for subagent stuck-loop watchdog (strategy/budget rules in classify.mjs).
# Forever unit OK: idle-aware — no tick / no metrics when no active workers; sleep only.
# Prefer sample at $STATE_DIR/sample.json (coordinator drops it). Softlock stays separate.
# Fail-open around tick failures.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
BIN="${SUBAGENT_WATCHDOG_BIN:-$ROOT/bin/subagent-watchdog}"
STATE_DIR="${SUBAGENT_WATCHDOG_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/subagent-watchdog}"
INTERVAL_SEC="${SUBAGENT_WATCHDOG_INTERVAL_SEC:-60}"
IDLE_INTERVAL_SEC="${SUBAGENT_WATCHDOG_IDLE_INTERVAL_SEC:-$INTERVAL_SEC}"
SAMPLE_PATH="${SUBAGENT_WATCHDOG_SAMPLE:-$STATE_DIR/sample.json}"
LOG="${SUBAGENT_WATCHDOG_LOOP_LOG:-$STATE_DIR/loop.log}"

mkdir -p "$STATE_DIR"
touch "$LOG"
echo $$ >"$STATE_DIR/loop.pid"
date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/loop-started-utc.txt"

log() {
	printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG" >/dev/null
}

idle_skip() {
	local reason="$1"
	date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/loop-last-utc.txt"
	date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/loop-idle-utc.txt"
	printf '%s\n' "$reason" >"$STATE_DIR/loop-idle-reason.txt"
	log "idle skip ($reason) — no tick, metrics unchanged"
	sleep "$IDLE_INTERVAL_SEC"
}

log "started interval=${INTERVAL_SEC}s idle_interval=${IDLE_INTERVAL_SEC}s state=$STATE_DIR bin=$BIN"
# Start cue once (daemon start / enable --now / restart). Never every idle skip or tick.
_start_cue_bin="${SUBAGENT_WATCHDOG_START_CUE:-${WATCHDOG_START_CUE_BIN:-$HOME/.local/bin/watchdog-start-cue}}"
_repo_cue="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/watchdog-start-cue.sh"
if [[ "${WATCHDOG_START_CUE:-1}" != "0" ]]; then
	if command -v watchdog-start-cue >/dev/null 2>&1; then
		watchdog-start-cue "PEM subagent watchdog" "Started (idle-aware loop)." || true
		log "start_cue: watchdog-start-cue (notify-send + sound)"
	elif [[ -x "$_start_cue_bin" ]]; then
		"$_start_cue_bin" "PEM subagent watchdog" "Started (idle-aware loop)." || true
		log "start_cue: $_start_cue_bin (notify-send + sound)"
	elif [[ -x "$_repo_cue" ]]; then
		"$_repo_cue" "PEM subagent watchdog" "Started (idle-aware loop)." || true
		log "start_cue: $_repo_cue (notify-send + sound)"
	else
		log "start_cue: skipped (no watchdog-start-cue helper)"
	fi
fi
unset _start_cue_bin _repo_cue

while true; do
	date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/loop-last-utc.txt"

	if [[ ! -x "$BIN" ]]; then
		log "missing bin: $BIN"
		sleep "$INTERVAL_SEC"
		continue
	fi

	if [[ ! -f "$SAMPLE_PATH" ]]; then
		idle_skip "no_sample"
		continue
	fi

	# `active` does not record metrics — use it to decide whether to tick.
	active_out="$("$BIN" active --sample "$SAMPLE_PATH" --state "$STATE_DIR" 2>&1)" && active_ok=1 || active_ok=0
	active_n="$(printf '%s' "$active_out" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.active_workers??0));}catch{process.stdout.write("0");}})' 2>/dev/null || echo 0)"
	if [[ "$active_ok" -ne 1 ]] || [[ "${active_n:-0}" -lt 1 ]]; then
		idle_skip "no_active_workers=${active_n:-0}"
		continue
	fi

	out="$("$BIN" tick --sample "$SAMPLE_PATH" --state "$STATE_DIR" 2>&1)" && ok=1 || ok=0
	if [[ "$ok" -eq 1 ]]; then
		rm -f "$STATE_DIR/loop-idle-reason.txt"
		should="$(printf '%s' "$out" | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{const j=JSON.parse(s);process.stdout.write(String(j.should_poll));}catch{process.stdout.write("?");}})' 2>/dev/null || echo '?')"
		log "tick ok active_workers=$active_n should_poll=$should"
	else
		log "tick fail: $out"
	fi
	sleep "$INTERVAL_SEC"
done
