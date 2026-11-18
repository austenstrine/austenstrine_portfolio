#!/usr/bin/env bash
# subagentStart: allow + LOG-ONLY watchdog arm remind (fail-open).
# No additional_context / user_message (host prefs-skills-subagent.sh owns text).
set -u
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${HOOK_DIR}/state"
mkdir -p "${STATE_DIR}" 2>/dev/null || true
LOG="${STATE_DIR}/watchdog-subagent-start.log"

cat >/dev/null 2>&1 || true
{
  printf '%s\n' "[watchdog hook / subagentStart] arm subscribe_timer pem-subagent-watchdog (60s) if not already; tick via ./bin/subagent-watchdog; skill ~/.agents/skills/watchdog/SKILL.md"
} >>"${LOG}" 2>/dev/null || true
printf '%s\n' '{"permission":"allow"}'
exit 0
