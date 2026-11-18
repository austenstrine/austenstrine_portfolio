#!/usr/bin/env bash
# One-shot desktop cue when a PEM watchdog daemon starts / is enabled.
# Softlock + pem-subagent process start only — never every poll/tick.
# Visual: notify-send. Audio: paplay → canberra-gtk-play → pw-play.
# Fail-open. Disable: WATCHDOG_START_CUE=0
set -u

[[ "${WATCHDOG_START_CUE:-1}" == "0" ]] && exit 0

TITLE="${1:-PEM watchdog}"
BODY="${2:-Started.}"
SOUND_ID="${WATCHDOG_START_CUE_SOUND:-message-new-instant}"
SOUND_FILE="${WATCHDOG_START_CUE_FILE:-/usr/share/sounds/freedesktop/stereo/${SOUND_ID}.oga}"

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
