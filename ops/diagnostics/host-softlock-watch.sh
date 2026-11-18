#!/usr/bin/env bash
# Host softlock watchdog (Raider / Cursor sandbox).
# Detects:
#   - kernel soft lockups + hung `cursorsandbox --preflight-only`
#   - rising/stuck D-state on glycin/bwrap/runc/docker-proxy/kworker netns patterns
#   - journal/dmesg RCU stall / expedited stall / synchronize_rcu_expedited
# Actions: metrics + status.json for agents; optionally SIGTERM *new* non-D
# docker create/build pile-on (never SIGKILL D-state — useless / harmful).
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
STATUS_JSON="${HOST_SOFTLOCK_STATUS_JSON:-$STATE_DIR/status.json}"
STALL_FLAG="${HOST_SOFTLOCK_STALL_FLAG:-$STATE_DIR/stall-elevated}"
PILEON_PAUSE_FLAG="${HOST_SOFTLOCK_PILEON_PAUSE_FLAG:-$STATE_DIR/docker-pileon-pause}"
PREFLIGHT_MAX_AGE_SEC="${HOST_SOFTLOCK_PREFLIGHT_MAX_AGE_SEC:-10}"
POLL_SEC="${HOST_SOFTLOCK_POLL_SEC:-5}"
NOTIFY_COOLDOWN_SEC="${HOST_SOFTLOCK_NOTIFY_COOLDOWN_SEC:-60}"
D_STATE_MIN="${HOST_SOFTLOCK_D_STATE_MIN:-2}"
D_STATE_STUCK_POLLS="${HOST_SOFTLOCK_D_STATE_STUCK_POLLS:-3}"
CLEAR_POLLS="${HOST_SOFTLOCK_CLEAR_POLLS:-3}"
# 1 = SIGTERM non-D docker create/build when elevated; 0 = status/metrics only
DOCKER_PILEON="${HOST_SOFTLOCK_DOCKER_PILEON:-1}"
D_STATE_RE="${HOST_SOFTLOCK_D_STATE_RE:-glycin|bwrap|runc|docker-proxy|containerd-shim|dockerd|kworker/.*netns|netns}"
PREFLIGHT_RE='cursorsandbox.*--preflight-only'
RCU_RE='rcu[_ ].*stall|INFO: rcu_|detected stalls? on CPUs|Expedited RCU stall|expedited.*stall|synchronize_rcu_expedited|stalls? detected.*rcu'

mkdir -p "$STATE_DIR"
touch "$LOG" "$METRICS_LOG"
echo $$ >"$STATE_DIR/watch.pid"
date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/started-utc.txt"

metrics_init() {
  if [[ ! -f "$METRICS_JSON" ]]; then
    cat >"$METRICS_JSON" <<EOF
{
  "schema": "host-softlock-metrics.v2",
  "ticks": 0,
  "soft_lockup_hits": 0,
  "d_state_hits": 0,
  "rcu_stall_hits": 0,
  "docker_pileon_stops": 0,
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
let m={schema:"host-softlock-metrics.v2",ticks:0,soft_lockup_hits:0,d_state_hits:0,rcu_stall_hits:0,docker_pileon_stops:0,preflight_kills:0,notifies:0,notify_suppressed:0,started_at:at,updated_at:null};
try { m={...m,...JSON.parse(fs.readFileSync(p,"utf8"))}; } catch (_) {}
m.schema="host-softlock-metrics.v2";
for (const k of ["d_state_hits","rcu_stall_hits","docker_pileon_stops"]) if (m[k]==null) m[k]=0;
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
  # Stuck userns helpers often ride along — only if not D-state.
  while read -r pid stat; do
    [[ -z "$pid" ]] && continue
    [[ "$stat" == D* ]] && continue
    kill -9 "$pid" 2>/dev/null || true
  done < <(ps -eo pid=,stat=,args= 2>/dev/null | awk '/\/usr\/bin\/bwrap/ {print $1, $2}')
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
  journalctl -k -b --since "${POLL_SEC} seconds ago" --no-pager -o cat 2>/dev/null \
    | grep -E 'BUG: soft lockup' || true
}

rcu_stall_recent() {
  {
    journalctl -k -b --since "${POLL_SEC} seconds ago" --no-pager -o cat 2>/dev/null || true
    # dmesg may need CAP_SYSLOG; fail-open.
    dmesg --ctime 2>/dev/null | tail -n 200 || true
  } | grep -Ei "$RCU_RE" || true
}

# Lines: pid etimes comm (suspect D-state only).
collect_d_state_suspects() {
  local pid stat etimes comm rest
  # shellcheck disable=SC2034
  while read -r pid stat etimes comm rest; do
    [[ -z "$pid" ]] && continue
    [[ "$stat" == D* ]] || continue
    if [[ "$comm $rest" =~ $D_STATE_RE ]]; then
      printf '%s %s %s\n' "$pid" "$etimes" "$comm"
    fi
  done < <(ps -eo pid=,stat=,etimes=,comm=,args= --no-headers 2>/dev/null || true)
}

# SIGTERM non-D docker create/build/compose pile-on. Never touch D-state.
stop_new_docker_pileon() {
  local reason="$1"
  local stopped=0 pid stat etimes args
  touch "$PILEON_PAUSE_FLAG"
  while read -r pid stat etimes args; do
    [[ -z "$pid" ]] && continue
    [[ "$stat" == D* ]] && continue
    case "$args" in
      *'docker build'*|*'docker compose'*' build'*|*'docker-compose'*' build'*|*'buildx build'*|*'compose'*' create'*|*'compose'*' up'*)
        log "docker_pileon_stop: pid=$pid etimes=${etimes}s reason=$reason cmd=$(printf '%s' "$args" | cut -c1-120)"
        kill -TERM "$pid" 2>/dev/null || true
        stopped=$((stopped + 1))
        ;;
    esac
  done < <(ps -eo pid=,stat=,etimes=,args= --no-headers 2>/dev/null | awk '
    /docker( |-)(compose|build)|buildx|compose .* (build|create|up)/ && $2 !~ /^D/ {print}
  ' || true)
  if (( stopped > 0 )); then
    metrics_bump docker_pileon_stops
    metrics_event docker_pileon_stop "count=$stopped reason=$reason"
  fi
  return 0
}

write_status() {
  local elevated="$1"
  local soft_hit="$2"
  local d_count="$3"
  local rcu_hit="$4"
  local sample="$5"
  local reasons="[]"
  local pileon=0
  [[ -f "$PILEON_PAUSE_FLAG" ]] && pileon=1
  node -e '
const fs=require("fs");
const elevated=process.argv[1]==="1";
const soft=process.argv[2]==="1";
const dCount=Number(process.argv[3]||0);
const rcu=process.argv[4]==="1";
const sample=process.argv[5]||"";
const pileon=process.argv[6]==="1";
const outPath=process.argv[7];
const reasons=[];
if (soft) reasons.push("soft_lockup");
if (dCount>0) reasons.push("d_state");
if (rcu) reasons.push("rcu_stall");
const sampleLines=sample.trim()?sample.trim().split(/\n/).slice(0,12):[];
const o={
  schema:"host-softlock-status.v1",
  ok:!elevated,
  elevated,
  reasons,
  soft_lockup_recent:soft,
  d_state_count:dCount,
  d_state_sample:sampleLines,
  rcu_recent:rcu,
  docker_pileon_paused:pileon,
  agent_hint: elevated
    ? "Host D-state/RCU/softlock elevated. Refuse new docker create/build (dssh launch gated). Do not SIGKILL D-state. See events.log + metrics.json."
    : "Host softlock watch clear.",
  updated_at: new Date().toISOString().replace(/\.\d+Z$/,"Z")
};
fs.writeFileSync(outPath, JSON.stringify(o,null,2)+"\n");
' "$elevated" "$soft_hit" "$d_count" "$rcu_hit" "$sample" "$pileon" "$STATUS_JSON"
  if [[ "$elevated" == "1" ]]; then
    touch "$STALL_FLAG"
  else
    rm -f "$STALL_FLAG"
  fi
}

prev_d_pids=""
stuck_polls=0
prev_d_count=0
clean_polls=0
elevated=0

metrics_init
log "started poll=${POLL_SEC}s preflight_max_age=${PREFLIGHT_MAX_AGE_SEC}s d_min=${D_STATE_MIN} stuck_polls=${D_STATE_STUCK_POLLS} pileon=${DOCKER_PILEON} state=$STATE_DIR"
metrics_event started "poll=${POLL_SEC}s d_min=${D_STATE_MIN} pileon=${DOCKER_PILEON}"
# Start cue once (daemon start / enable --now / restart). Never every poll tick.
_start_cue_bin="${HOST_SOFTLOCK_START_CUE:-${WATCHDOG_START_CUE_BIN:-$HOME/.local/bin/watchdog-start-cue}}"
if [[ "${WATCHDOG_START_CUE:-1}" != "0" ]]; then
  if command -v watchdog-start-cue >/dev/null 2>&1; then
    watchdog-start-cue "Host softlock watch" "Started (softlock + D-state/RCU)." || true
    log "start_cue: watchdog-start-cue (notify-send + sound)"
    metrics_event start_cue "bin=watchdog-start-cue"
  elif [[ -x "$_start_cue_bin" ]]; then
    "$_start_cue_bin" "Host softlock watch" "Started (softlock + D-state/RCU)." || true
    log "start_cue: $_start_cue_bin (notify-send + sound)"
    metrics_event start_cue "bin=$_start_cue_bin"
  else
    log "start_cue: skipped (no watchdog-start-cue on PATH / $_start_cue_bin)"
  fi
fi
unset _start_cue_bin
# Reboot / service restart leaves docker-pileon-pause while in-memory elevated=0,
# so the elevate→clear transition never runs and dssh launch false-refuses.
if [[ -f "$PILEON_PAUSE_FLAG" ]]; then
  log "clearing orphan docker-pileon-pause on start (elevated memory=0; will re-touch if still elevated)"
  metrics_event orphan_pause_cleared "on_start=1"
  rm -f "$PILEON_PAUSE_FLAG"
fi
rm -f "$STALL_FLAG"
write_status 0 0 0 0 "" 

while true; do
  date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE_DIR/last-check-utc.txt"
  metrics_bump ticks

  soft_hits="$(softlock_recent)"
  soft_flag=0
  if [[ -n "$soft_hits" ]]; then
    soft_flag=1
    count="$(printf '%s\n' "$soft_hits" | grep -c . || true)"
    log "soft_lockup_hits=$count"
    printf '%s\n' "$soft_hits" | head -n 20 >>"$LOG"
    metrics_bump soft_lockup_hits
    metrics_event soft_lockup "hits=$count"
    kill_preflight "kernel_soft_lockup"
  elif stuck="$(preflight_too_old)"; then
    log "hung_preflight: $stuck"
    metrics_event hung_preflight "$stuck"
    kill_preflight "preflight_age>=${PREFLIGHT_MAX_AGE_SEC}s"
  fi

  d_sample="$(collect_d_state_suspects || true)"
  d_count=0
  d_pids=""
  if [[ -n "$d_sample" ]]; then
    d_count="$(printf '%s\n' "$d_sample" | grep -c . || true)"
    d_pids="$(printf '%s\n' "$d_sample" | awk '{print $1}' | sort | tr '\n' ' ')"
  fi

  d_rising=0
  d_stuck=0
  if (( d_count >= D_STATE_MIN )); then
    if (( d_count > prev_d_count )); then
      d_rising=1
    fi
    if [[ -n "$d_pids" && "$d_pids" == "$prev_d_pids" ]]; then
      stuck_polls=$((stuck_polls + 1))
    else
      stuck_polls=1
    fi
    if (( stuck_polls >= D_STATE_STUCK_POLLS )); then
      d_stuck=1
    fi
  else
    stuck_polls=0
  fi
  prev_d_count="$d_count"
  prev_d_pids="$d_pids"

  d_elev=0
  if (( d_rising == 1 || d_stuck == 1 )); then
    d_elev=1
    log "d_state: count=$d_count rising=$d_rising stuck=$d_stuck stuck_polls=$stuck_polls sample=$(printf '%s' "$d_sample" | tr '\n' ';')"
    metrics_bump d_state_hits
    metrics_event d_state "count=$d_count rising=$d_rising stuck=$d_stuck"
  fi

  rcu_hits="$(rcu_stall_recent)"
  rcu_flag=0
  if [[ -n "$rcu_hits" ]]; then
    rcu_flag=1
    rcount="$(printf '%s\n' "$rcu_hits" | grep -c . || true)"
    log "rcu_stall_hits=$rcount"
    printf '%s\n' "$rcu_hits" | head -n 20 >>"$LOG"
    metrics_bump rcu_stall_hits
    metrics_event rcu_stall "hits=$rcount"
  fi

  now_elev=0
  if (( soft_flag == 1 || d_elev == 1 || rcu_flag == 1 )); then
    now_elev=1
  fi

  if (( now_elev == 1 )); then
    clean_polls=0
    if (( elevated == 0 )); then
      notify "Host stall elevated (soft=$soft_flag d_state=$d_elev rcu=$rcu_flag). Pausing new docker create/build pile-on."
    fi
    elevated=1
    if [[ "$DOCKER_PILEON" == "1" ]]; then
      stop_new_docker_pileon "elevated soft=$soft_flag d=$d_elev rcu=$rcu_flag"
    else
      touch "$PILEON_PAUSE_FLAG"
    fi
  else
    clean_polls=$((clean_polls + 1))
    # Clear pause after CLEAR_POLLS even if this process never saw elevated=1
    # (orphan flag after crash/reboot, or status.json elevated=false mismatch).
    if (( clean_polls >= CLEAR_POLLS )); then
      if (( elevated == 1 )); then
        log "stall cleared after ${clean_polls} clean polls"
        metrics_event stall_cleared "clean_polls=$clean_polls"
        elevated=0
      elif [[ -f "$PILEON_PAUSE_FLAG" ]]; then
        log "clearing orphan docker-pileon-pause after ${clean_polls} clean polls"
        metrics_event orphan_pause_cleared "clean_polls=$clean_polls"
      fi
      rm -f "$PILEON_PAUSE_FLAG"
    fi
  fi

  write_status "$elevated" "$soft_flag" "$d_count" "$rcu_flag" "$d_sample"
  sleep "$POLL_SEC"
done
