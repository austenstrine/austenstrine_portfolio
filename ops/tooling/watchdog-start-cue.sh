#!/usr/bin/env bash
# One-shot desktop cue when a PEM watchdog daemon starts / is enabled.
# Softlock + pem-subagent process start only — never every poll/tick.
# Visual: notify-send. Audio: paplay → canberra-gtk-play → pw-play.
# Fail-open. Disable: WATCHDOG_START_CUE=0
# Hard wall-clock cooldown (default 3600s): sessionStart stamp clears / unit
# restarts / install scripts must not re-fire notify within the window.
# Exit 0 = fired or disabled. Exit 3 = cooldown skip (ensure reports cue.skipped=cooldown).
set -u

[[ "${WATCHDOG_START_CUE:-1}" == "0" ]] && exit 0

STATE_DIR="${XDG_STATE_HOME:-$HOME/.local/state}/watchdog-start-cue"
COOLDOWN_SEC="${WATCHDOG_START_CUE_COOLDOWN_SEC:-3600}"
LAST_FILE="${STATE_DIR}/last-cue.utc"
mkdir -p "$STATE_DIR" 2>/dev/null || true

now_epoch="$(date -u +%s)"
if [[ -f "$LAST_FILE" ]]; then
	last_raw="$(tr -d '[:space:]' <"$LAST_FILE" 2>/dev/null || true)"
	last_epoch=""
	if [[ "$last_raw" =~ ^[0-9]+$ ]]; then
		last_epoch="$last_raw"
	elif [[ -n "$last_raw" ]]; then
		last_epoch="$(date -u -d "$last_raw" +%s 2>/dev/null || true)"
	fi
	if [[ -n "${last_epoch:-}" ]]; then
		elapsed=$((now_epoch - last_epoch))
		if (( elapsed >= 0 && elapsed < COOLDOWN_SEC )); then
			exit 3
		fi
	fi
fi

TITLE="${1:-PEM watchdog}"
BODY="${2:-Started.}"
SOUND_ID="${WATCHDOG_START_CUE_SOUND:-message-new-instant}"
SOUND_FILE="${WATCHDOG_START_CUE_FILE:-/usr/share/sounds/freedesktop/stereo/${SOUND_ID}.oga}"

# Stamp BEFORE notify so concurrent callers also skip.
date -u +%Y-%m-%dT%H:%M:%SZ >"$LAST_FILE" 2>/dev/null || true

# Visual (desktop notification banner)
if command -v notify-send >/dev/null 2>&1; then
	notify-send -u normal -a "PEM watchdog" --hint=string:desktop-entry:gnome-system-monitor \
		"$TITLE" "$BODY" >/dev/null 2>&1 || true
fi

# Audio (short system sound — not hey-alarm)
if command -v paplay >/dev/null 2>&1 && [[ -f "$SOUND_FILE" ]]; then
	paplay "$SOUND_FILE" >/dev/null 2>&1 || true
elif command -v canberra-gtk-play >/dev/null 2>&1; then
	canberra-gtk-play -i "$SOUND_ID" >/dev/null 2>&1 || true
elif command -v pw-play >/dev/null 2>&1 && [[ -f "$SOUND_FILE" ]]; then
	pw-play "$SOUND_FILE" >/dev/null 2>&1 || true
fi

exit 0
