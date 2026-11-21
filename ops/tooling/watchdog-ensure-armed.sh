#!/usr/bin/env bash
# Ensure softlock + pem-subagent units active. No flap: never restart when already active.
# Session start cue: only with --cue-session; stamp gates re-cue within a session.
# session-start.sh clears the stamp at session start (else once-forever). Never per-spawn.
# Softlock: always-on; never stop/disable from this helper.
# Subagent: prefer forever idle-aware unit; start only if inactive; never stop here.
# Usage: watchdog-ensure-armed.sh [--cue-session] [--json]
# --json alone never cues and leaves cue.skipped empty (only --cue-session sets skipped).
# Env: WATCHDOG_START_CUE=0 disables cue. WATCHDOG_ENSURE_DRY=1 skip systemctl start.
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOFT_UNIT="host-softlock-watch.service"
SUB_UNIT="pem-subagent-watchdog.service"
STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/pem-watchdog-ensure"
SESSION_STAMP="${STATE_DIR}/session-cue.stamp"
CUE_BIN="${WATCHDOG_START_CUE_BIN:-$HOME/.local/bin/watchdog-start-cue}"
REPO_CUE="$ROOT/ops/tooling/watchdog-start-cue.sh"
WANT_CUE=0
WANT_JSON=0

for arg in "$@"; do
	case "$arg" in
		--cue-session) WANT_CUE=1 ;;
		--json) WANT_JSON=1 ;;
		-h|--help)
			printf '%s\n' "usage: $0 [--cue-session] [--json]"
			exit 0
			;;
	esac
done

mkdir -p "$STATE_DIR" 2>/dev/null || true

unit_active() {
	local u="$1"
	command -v systemctl >/dev/null 2>&1 || return 1
	systemctl --user is-active "$u" >/dev/null 2>&1
}

unit_enabled() {
	local u="$1"
	command -v systemctl >/dev/null 2>&1 || return 1
	systemctl --user is-enabled "$u" >/dev/null 2>&1
}

# Start+enable only when inactive. Never restart (avoids cue spam / flap).
ensure_unit() {
	local u="$1"
	if unit_active "$u"; then
		printf '%s' "already_active"
		return 0
	fi
	if [[ "${WATCHDOG_ENSURE_DRY:-0}" == "1" ]]; then
		printf '%s' "dry_inactive"
		return 1
	fi
	if ! command -v systemctl >/dev/null 2>&1; then
		printf '%s' "no_systemctl"
		return 1
	fi
	if systemctl --user enable --now "$u" >/dev/null 2>&1 && unit_active "$u"; then
		printf '%s' "started"
		return 0
	fi
	if systemctl --user start "$u" >/dev/null 2>&1 && unit_active "$u"; then
		printf '%s' "started"
		return 0
	fi
	printf '%s' "inactive"
	return 1
}

soft_before=0
sub_before=0
unit_active "$SOFT_UNIT" && soft_before=1
unit_active "$SUB_UNIT" && sub_before=1

soft_result="$(ensure_unit "$SOFT_UNIT" || true)"
sub_result="$(ensure_unit "$SUB_UNIT" || true)"

soft_active=0
sub_active=0
unit_active "$SOFT_UNIT" && soft_active=1
unit_active "$SUB_UNIT" && sub_active=1
soft_enabled=0
sub_enabled=0
unit_enabled "$SOFT_UNIT" && soft_enabled=1
unit_enabled "$SUB_UNIT" && sub_enabled=1

armed=0
[[ "$soft_active" -eq 1 && "$sub_active" -eq 1 ]] && armed=1

host_capable=0
command -v systemctl >/dev/null 2>&1 && host_capable=1

cue_fired=0
cue_skipped_reason=""
if [[ "$WANT_CUE" -eq 1 ]]; then
	if [[ "${WATCHDOG_START_CUE:-1}" == "0" ]]; then
		cue_skipped_reason="disabled"
	elif [[ -f "$SESSION_STAMP" ]]; then
		cue_skipped_reason="already_cued_this_session"
	elif [[ "$armed" -ne 1 ]]; then
		cue_skipped_reason="units_not_armed"
	else
		date -u +%Y-%m-%dT%H:%M:%SZ >"$SESSION_STAMP" 2>/dev/null || true
		body="Softlock + pem-subagent armed (session). Softlock always-on; subagent idle-skips when no workers."
		if command -v watchdog-start-cue >/dev/null 2>&1; then
			watchdog-start-cue "PEM watchdogs armed" "$body" >/dev/null 2>&1 || true
			cue_fired=1
		elif [[ -x "$CUE_BIN" ]]; then
			"$CUE_BIN" "PEM watchdogs armed" "$body" >/dev/null 2>&1 || true
			cue_fired=1
		elif [[ -x "$REPO_CUE" ]]; then
			"$REPO_CUE" "PEM watchdogs armed" "$body" >/dev/null 2>&1 || true
			cue_fired=1
		else
			cue_skipped_reason="no_cue_helper"
			rm -f "$SESSION_STAMP" 2>/dev/null || true
		fi
	fi
fi

summary="armed=${armed} soft=${soft_active}/${soft_result} sub=${sub_active}/${sub_result} cue=${cue_fired}${cue_skipped_reason:+ ($cue_skipped_reason)} host=${host_capable}"

if [[ "$WANT_JSON" -eq 1 ]]; then
	export W_ARMED="$armed" W_HOST="$host_capable" \
		W_SOFT_A="$soft_active" W_SOFT_E="$soft_enabled" W_SOFT_B="$soft_before" W_SOFT_R="$soft_result" \
		W_SUB_A="$sub_active" W_SUB_E="$sub_enabled" W_SUB_B="$sub_before" W_SUB_R="$sub_result" \
		W_CUE="$cue_fired" W_CUE_SKIP="$cue_skipped_reason" W_STAMP="$SESSION_STAMP" W_SUM="$summary"
	node <<'NODE' 2>/dev/null || printf '%s\n' "{\"armed\":${armed},\"summary\":\"${summary}\"}"
const o = {
  ok: process.env.W_ARMED === "1",
  armed: process.env.W_ARMED === "1",
  host_capable: process.env.W_HOST === "1",
  softlock: {
    active: process.env.W_SOFT_A === "1",
    enabled: process.env.W_SOFT_E === "1",
    before: process.env.W_SOFT_B === "1",
    result: process.env.W_SOFT_R || "",
  },
  subagent: {
    active: process.env.W_SUB_A === "1",
    enabled: process.env.W_SUB_E === "1",
    before: process.env.W_SUB_B === "1",
    result: process.env.W_SUB_R || "",
  },
  cue: {
    fired: process.env.W_CUE === "1",
    skipped: process.env.W_CUE_SKIP || "",
    stamp: process.env.W_STAMP || "",
  },
  summary: process.env.W_SUM || "",
  never: {
    softlock_stop: true,
    restart_when_active: true,
    cue_per_spawn: true,
    unsubscribe_while_workers_alive: true,
  },
};
process.stdout.write(JSON.stringify(o) + "\n");
NODE
else
	printf '%s\n' "$summary"
fi

if [[ "$host_capable" -eq 0 ]]; then
	exit 0
fi
if [[ "$armed" -eq 1 ]]; then
	exit 0
fi
exit 2
