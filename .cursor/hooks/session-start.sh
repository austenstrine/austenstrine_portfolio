#!/usr/bin/env bash
# sessionStart: graphify ensure + softlock liveness + watchdog/graphify start hints.
# Fail-open. Prefer hooks over prose for must-every-time start rules.
# Params live in ~/.agents/skills/watchdog/SKILL.md (and .cursor/skills/watchdog/).
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || true

# Drain stdin (session payload); ignore parse failures.
cat >/dev/null 2>&1 || true

soft_state="${XDG_STATE_HOME:-$HOME/.local/state}/host-softlock-watch"
sub_state="${SUBAGENT_WATCHDOG_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/subagent-watchdog}"
graphify_status="skip"
soft_active="0"
soft_enabled="0"

if [[ -x "$ROOT/ops/tooling/install-graphify-hooks.sh" ]]; then
	"$ROOT/ops/tooling/install-graphify-hooks.sh" --quiet >/dev/null 2>&1 || true
fi
if [[ -x "$ROOT/ops/tooling/install-watchdog-skill.sh" ]]; then
	"$ROOT/ops/tooling/install-watchdog-skill.sh" --quiet >/dev/null 2>&1 || true
fi
# Prefer published host skill when present; else repo mirror.
skill="$HOME/.agents/skills/watchdog/SKILL.md"
[[ -f "$skill" ]] || skill="$ROOT/.cursor/skills/watchdog/SKILL.md"
if [[ -x "$ROOT/ops/tooling/graphify-ensure.sh" ]]; then
	out="$("$ROOT/ops/tooling/graphify-ensure.sh" 2>&1)" || true
	if printf '%s' "$out" | grep -q 'fresh (HEAD'; then
		graphify_status="fresh"
	elif printf '%s' "$out" | grep -qiE 'ok|stamped|ensure'; then
		graphify_status="ensured"
	else
		graphify_status="ran"
	fi
fi

if command -v systemctl >/dev/null 2>&1; then
	systemctl --user is-active host-softlock-watch.service >/dev/null 2>&1 && soft_active=1
	systemctl --user is-enabled host-softlock-watch.service >/dev/null 2>&1 && soft_enabled=1
fi

export PEM_HOOK_GRAPHIFY="$graphify_status"
export PEM_HOOK_SOFT_ACTIVE="$soft_active"
export PEM_HOOK_SOFT_ENABLED="$soft_enabled"
export PEM_HOOK_SKILL="$skill"
export PEM_HOOK_SOFT_STATE="$soft_state"
export PEM_HOOK_SUB_STATE="$sub_state"

node <<'NODE' 2>/dev/null || printf '%s\n' '{}'
const ctx = [
  '[portfolio sessionStart hooks]',
  `- Graphify: prefer query|path|explain before wide Grep. Ensure status=${process.env.PEM_HOOK_GRAPHIFY}. Git post-merge/post-checkout refresh when installed.`,
  `- Softlock: stay on (systemd --user). active=${process.env.PEM_HOOK_SOFT_ACTIVE} enabled=${process.env.PEM_HOOK_SOFT_ENABLED}. Install: ./ops/diagnostics/install-host-softlock-watch.sh. Metrics: ${process.env.PEM_HOOK_SOFT_STATE}/metrics.json`,
  `- Subagent watchdog: prefer forever pem-subagent-watchdog.service (idle skip when no workers); optional subscribe_timer 60s while workers active. Metrics ticks only on real classify. Metrics: ${process.env.PEM_HOOK_SUB_STATE}/metrics.json`,
  `- Params skill (read when touching watchdogs): ${process.env.PEM_HOOK_SKILL}`,
  '- Status: ./bin/agent-cli watchdog',
].join('\n');
process.stdout.write(JSON.stringify({
  env: {
    PEM_WATCHDOG_SKILL: process.env.PEM_HOOK_SKILL,
    PEM_SOFTLOCK_STATE: process.env.PEM_HOOK_SOFT_STATE,
    PEM_SUBAGENT_WATCHDOG_STATE: process.env.PEM_HOOK_SUB_STATE,
    PEM_GRAPHIFY_SESSION: process.env.PEM_HOOK_GRAPHIFY,
    PEM_SOFTLOCK_ACTIVE: process.env.PEM_HOOK_SOFT_ACTIVE,
    PEM_SOFTLOCK_ENABLED: process.env.PEM_HOOK_SOFT_ENABLED,
  },
  additional_context: ctx,
}));
NODE
exit 0
