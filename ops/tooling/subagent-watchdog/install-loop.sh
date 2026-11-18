#!/usr/bin/env bash
# Install + enable host keep-alive for subagent stuck-loop watchdog.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SRC_LOOP="$ROOT/ops/tooling/subagent-watchdog/loop.sh"
SRC_UNIT="$ROOT/ops/tooling/subagent-watchdog/pem-subagent-watchdog.service"
DEST_BIN="${SUBAGENT_WATCHDOG_LOOP_BIN:-$HOME/.local/bin/pem-subagent-watchdog-loop}"
DEST_UNIT="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user/pem-subagent-watchdog.service"

[[ -f "$SRC_LOOP" ]] || { echo "missing $SRC_LOOP" >&2; exit 1; }
[[ -f "$SRC_UNIT" ]] || { echo "missing $SRC_UNIT" >&2; exit 1; }

mkdir -p "$(dirname "$DEST_BIN")" "$(dirname "$DEST_UNIT")"
# Rewrite ROOT into installed loop via env — loop resolves portfolio from script path;
# installed copy should point at portfolio checkout.
install -m 0755 "$SRC_LOOP" "$DEST_BIN"
# Force bin to use this worktree/checkout's ./bin/subagent-watchdog
sed -i "2a\\ROOT=\"$ROOT\"" "$DEST_BIN" 2>/dev/null || true
# cleaner: wrap
cat >"$DEST_BIN" <<EOF
#!/usr/bin/env bash
export SUBAGENT_WATCHDOG_BIN="$ROOT/bin/subagent-watchdog"
exec bash "$ROOT/ops/tooling/subagent-watchdog/loop.sh" "\$@"
EOF
chmod 0755 "$DEST_BIN"
install -m 0644 "$SRC_UNIT" "$DEST_UNIT"

systemctl --user daemon-reload
systemctl --user enable pem-subagent-watchdog.service
systemctl --user restart pem-subagent-watchdog.service
systemctl --user --no-pager --full status pem-subagent-watchdog.service | head -n 20

echo
echo "OK: subagent watchdog loop running"
echo "  bin:     $DEST_BIN"
echo "  unit:    $DEST_UNIT"
echo "  state:   \${XDG_STATE_HOME:-~/.local/state}/subagent-watchdog/"
echo "  sample:  drop workers JSON at .../sample.json for live classify"
echo "  metrics: .../metrics.json + metrics.jsonl"
