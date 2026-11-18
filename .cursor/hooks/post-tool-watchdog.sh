#!/usr/bin/env bash
# postToolUse (Task): LOG-ONLY watchdog arm/stop reminder.
# Fail-open. No additional_context (avoids clobbering host prefs-skills).
# Params: skill watchdog — not duplicated here.
set -u
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${HOOK_DIR}/state"
mkdir -p "${STATE_DIR}" 2>/dev/null || true
LOG="${STATE_DIR}/watchdog-task.log"

cat >/dev/null 2>&1 || true
node -e '
const msg = [
  "[watchdog hook / Task]",
  "If this spawn left ≥1 active worker: ensure subscribe_timer pem-subagent-watchdog delaySeconds=60.",
  "Each fire: ./bin/subagent-watchdog tick --sample <sample>; apply actions; unsubscribe when should_poll=false.",
  "Softlock stays on separately (systemd). Params: ~/.agents/skills/watchdog/SKILL.md · ./bin/agent-cli watchdog"
].join(" ");
process.stderr.write(msg + "\n");
process.stdout.write("{}");
' 2>>"${LOG}" || printf '%s\n' '{}'
exit 0
