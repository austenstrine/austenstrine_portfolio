#!/usr/bin/env bash
# subagentStart: allow + remind coordinator to arm stuck-loop timer (fail-open).
set -u
cat >/dev/null 2>&1 || true
printf '%s\n' '{
  "permission": "allow",
  "user_message": "Watchdog: arm subscribe_timer pem-subagent-watchdog (60s) if not already; tick via ./bin/subagent-watchdog; skill ~/.agents/skills/watchdog/SKILL.md"
}'
exit 0
