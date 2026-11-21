#!/usr/bin/env bash
# Install + enable host softlock watchdog as a systemd --user service.
# Idempotent. Softlock stays on across login; subagent watchdog is separate.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_SH="$ROOT/ops/diagnostics/host-softlock-watch.sh"
SRC_UNIT="$ROOT/ops/diagnostics/host-softlock-watch.service"
SRC_CUE="$ROOT/ops/tooling/watchdog-start-cue.sh"
DEST_BIN="${HOST_SOFTLOCK_BIN:-$HOME/.local/bin/host-softlock-watch}"
DEST_CUE="${WATCHDOG_START_CUE_BIN:-$HOME/.local/bin/watchdog-start-cue}"
DEST_UNIT="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/host-softlock-watch.service"

[[ -f "$SRC_SH" ]] || { echo "missing $SRC_SH" >&2; exit 1; }
[[ -f "$SRC_UNIT" ]] || { echo "missing $SRC_UNIT" >&2; exit 1; }
[[ -f "$SRC_CUE" ]] || { echo "missing $SRC_CUE" >&2; exit 1; }

if [[ -x "$ROOT/ops/tooling/install-watchdog-skill.sh" ]]; then
	"$ROOT/ops/tooling/install-watchdog-skill.sh" || true
fi

mkdir -p "$(dirname "$DEST_BIN")" "$(dirname "$DEST_UNIT")"
install -m 0755 "$SRC_SH" "$DEST_BIN"
install -m 0755 "$SRC_CUE" "$DEST_CUE"
install -m 0644 "$SRC_UNIT" "$DEST_UNIT"

systemctl --user daemon-reload
systemctl --user enable host-softlock-watch.service
systemctl --user restart host-softlock-watch.service
systemctl --user --no-pager --full status host-softlock-watch.service | head -n 20

echo
echo "OK: softlock watchdog running (softlock + D-state/RCU)"
echo "  bin:     $DEST_BIN"
echo "  unit:    $DEST_UNIT"
echo "  state:   \${XDG_STATE_HOME:-~/.local/state}/host-softlock-watch/"
echo "  status:  .../status.json (+ stall-elevated / docker-pileon-pause)"
echo "  metrics: .../metrics.json + metrics.jsonl"
echo "  skill:   ~/.agents/skills/watchdog/SKILL.md"
