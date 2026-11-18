#!/usr/bin/env bash
# postToolUse (Task): inject watchdog arm/stop reminder into agent context.
# Fail-open. Params: skill watchdog — not duplicated here.
set -u
cat >/dev/null 2>&1 || true
node -e '
const msg = [
  "[watchdog hook / Task]",
  "If this spawn left ≥1 active worker: ensure subscribe_timer pem-subagent-watchdog delaySeconds=60.",
  "Each fire: ./bin/subagent-watchdog tick --sample <sample>; apply actions; unsubscribe when should_poll=false.",
  "Softlock stays on separately (systemd). Params: ~/.agents/skills/watchdog/SKILL.md · ./bin/agent-cli watchdog"
].join(" ");
process.stdout.write(JSON.stringify({ additional_context: msg }));
' 2>/dev/null || printf '%s\n' '{}'
exit 0
