#!/usr/bin/env bash
# Host softlock watchdog (Raider / Cursor sandbox).
# Detects kernel soft lockups and hung `cursorsandbox --preflight-only`,
# SIGKILLs offenders, notifies the desktop user, and logs events + metrics.
#
# Intended as a systemd --user Type=simple service (Restart=always).
# Not related to ./bin/subagent-watchdog (agent stuck-loop poll).
# Install: ops/diagnostics/install-host-softlock-watch.sh
# Skill: ~/.agents/skills/watchdog/SKILL.md
set -euo pipefail

STATE_DIR="${HOST_SOFTLOCK_STATE_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/host-softlock-watch}"
LOG="${HOST_SOFTLOCK_LOG:-$STATE_DIR/events.log}"
METRICS_JSON="${HOST_SOFTLOCK_METRICS_JSON:-$STATE_DIR/metrics.json}"
METRICS_LOG="${HOST_SOFTLOCK_METRICS_LOG:-$STATE_DIR/metrics.jsonl}"
PREFLIGHT_MAX_AGE_SEC="${HOST_SOFTLOCK_PREFLIGHT_MAX_AGE_SEC:-10}"
POLL_SEC="${HOST_SOFTLOCK_POLL_SEC:-5}"
NOTIFY_COOLDOWN_SEC="${HOST_SOFTLOCK_NOTIFY_COOLDOWN_SEC:-60}"
PREFLIGHT_RE='cursorsandbox.*--preflight-only'

mkdir -p "$STATE_DIR"
touch "$LOG" "$METRICS_LOG"
echo $$ >"$STATE_DIR/watch.pid"
date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/started-utc.txt"

metrics_init() {
  if [[ ! -f "$METRICS_JSON" ]]; then
    cat >"$METRICS_JSON" <<EOF
{
  "schema": "host-softlock-metrics.v1",
  "ticks": 0,
  "soft_lockup_hits": 0,
  "preflight_kills": 0,
  "notifies": 0,
  "notify_suppressed": 0,
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "updated_at": null
}
EOF
  fi
}

metrics_bump() {
  local key="$1"
  local at
  at="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  node -e '
const fs=require("fs");
const p=process.argv[1];
const key=process.argv[2];
const at=process.argv[3];
let m={schema:"host-softlock-metrics.v1",ticks:0,soft_lockup_hits:0,preflight_kills:0,notifies:0,notify_suppressed:0,started_at:at,updated_at:null};
try { m={...m,...JSON.parse(fs.readFileSync(p,"utf8"))}; } catch (_) {}
m[key]=(m[key]||0)+1;
m.updated_at=at;
fs.writeFileSync(p, JSON.stringify(m,null,2)+"\n");
' "$METRICS_JSON" "$key" "$at"
}

metrics_event() {
  local kind="$1"
  shift
  printf '%s\n' "$(node -e '
const o={at:process.argv[1],kind:process.argv[2],detail:process.argv.slice(3).join(" ")};
process.stdout.write(JSON.stringify(o));
' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$kind" "$*")" >>"$METRICS_LOG"
}

log() {
  printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" | tee -a "$LOG" >/dev/null
}

last_notify_epoch=0
notify() {
  local msg="$1"
  local now
  now="$(date +%s)"
  if (( now - last_notify_epoch < NOTIFY_COOLDOWN_SEC )); then
    log "notify_suppressed: $msg"
    metrics_bump notify_suppressed
    metrics_event notify_suppressed "$msg"
    return 0
  fi
  last_notify_epoch="$now"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u critical "host softlock watch" "$msg" || true
  fi
  log "notify: $msg"
  metrics_bump notifies
  metrics_event notify "$msg"
}

kill_preflight() {
  local reason="$1"
  local pids
  pids="$(pgrep -f "$PREFLIGHT_RE" 2>/dev/null || true)"
  if [[ -z "$pids" ]]; then
    log "kill_preflight: none running ($reason)"
    return 0
  fi
  log "kill_preflight: reason=$reason pids=$(echo "$pids" | tr '\n' ' ')"
  # shellcheck disable=SC2086
  kill -9 $pids 2>/dev/null || true
  # Stuck userns helpers often ride along.
  pkill -9 -f '/usr/bin/bwrap' 2>/dev/null || true
  metrics_bump preflight_kills
  metrics_event preflight_kill "$reason"
  notify "Killed hung cursorsandbox --preflight-only ($reason)"
}

preflight_too_old() {
  local pid etimes
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    etimes="$(ps -o etimes= -p "$pid" 2>/dev/null | tr -d ' ' || true)"
    if [[ -n "$etimes" && "$etimes" =~ ^[0-9]+$ && "$etimes" -ge "$PREFLIGHT_MAX_AGE_SEC" ]]; then
      echo "$pid etimes=${etimes}s"
      return 0
    fi
  done < <(pgrep -f "$PREFLIGHT_RE" 2>/dev/null || true)
  return 1
}

softlock_recent() {
  # Any soft lockup in the last POLL window (+skew).
  journalctl -k -b --since "${POLL_SEC} seconds ago" --no-pager -o cat 2>/dev/null \
    | grep -E 'BUG: soft lockup' || true
}

metrics_init
log "started poll=${POLL_SEC}s preflight_max_age=${PREFLIGHT_MAX_AGE_SEC}s state=$STATE_DIR"
metrics_event started "poll=${POLL_SEC}s preflight_max_age=${PREFLIGHT_MAX_AGE_SEC}s"

while true; do
  date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/last-check-utc.txt"
  metrics_bump ticks
  hits="$(softlock_recent)"
  if [[ -n "$hits" ]]; then
    count="$(printf '%s\n' "$hits" | grep -c . || true)"
    log "soft_lockup_hits=$count"
    printf '%s\n' "$hits" | head -n 20 >>"$LOG"
    metrics_bump soft_lockup_hits
    metrics_event soft_lockup "hits=$count"
    kill_preflight "kernel_soft_lockup"
  elif stuck="$(preflight_too_old)"; then
    log "hung_preflight: $stuck"
    metrics_event hung_preflight "$stuck"
    kill_preflight "preflight_age>=${PREFLIGHT_MAX_AGE_SEC}s"
  fi
  sleep "$POLL_SEC"
done
