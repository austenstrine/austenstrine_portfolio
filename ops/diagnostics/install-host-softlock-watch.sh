#!/usr/bin/env bash
# Install + enable host softlock watchdog as a systemd --user service.
# Idempotent. Softlock stays on across login; subagent watchdog is separate.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC_SH="$ROOT/ops/diagnostics/host-softlock-watch.sh"
SRC_UNIT="$ROOT/ops/diagnostics/host-softlock-watch.service"
DEST_BIN="${HOST_SOFTLOCK_BIN:-$HOME/.local/bin/host-softlock-watch}"
DEST_UNIT="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/host-softlock-watch.service"

[[ -f "$SRC_SH" ]] || { echo "missing $SRC_SH" >&2; exit 1; }
[[ -f "$SRC_UNIT" ]] || { echo "missing $SRC_UNIT" >&2; exit 1; }

mkdir -p "$(dirname "$DEST_BIN")" "$(dirname "$DEST_UNIT")"
install -m 0755 "$SRC_SH" "$DEST_BIN"
install -m 0644 "$SRC_UNIT" "$DEST_UNIT"

systemctl --user daemon-reload
systemctl --user enable host-softlock-watch.service
systemctl --user restart host-softlock-watch.service
systemctl --user --no-pager --full status host-softlock-watch.service | head -n 20

echo
echo "OK: softlock watchdog running"
echo "  bin:     $DEST_BIN"
echo "  unit:    $DEST_UNIT"
echo "  state:   \${XDG_STATE_HOME:-~/.local/state}/host-softlock-watch/"
echo "  metrics: .../metrics.json + metrics.jsonl"
echo "  skill:   ~/.agents/skills/watchdog/SKILL.md"
