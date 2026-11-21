#!/usr/bin/env bash
# sessionStart: graphify ensure + fail-closed watchdog auto-arm (no flap) + session cue once.
# Softlock always-on; pem-subagent forever idle-skip. Never restart active units.
# Cue: once per session (stamp). Cloud/no-systemctl → soft reminder only (host units unreachable).
set -u

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT" || true
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${HOOK_DIR}/state"
mkdir -p "${STATE_DIR}" 2>/dev/null || true
LOG="${STATE_DIR}/watchdog-session.log"

# Drain stdin (session payload).
cat >/dev/null 2>&1 || true

soft_state="${XDG_STATE_HOME:-$HOME/.local/state}/host-softlock-watch"
sub_state="${SUBAGENT_WATCHDOG_DIR:-${XDG_STATE_HOME:-$HOME/.local/state}/subagent-watchdog}"
graphify_status="skip"

if [[ -x "$ROOT/ops/tooling/install-graphify-hooks.sh" ]]; then
	"$ROOT/ops/tooling/install-graphify-hooks.sh" --quiet >/dev/null 2>&1 || true
fi
if [[ -x "$ROOT/ops/tooling/install-watchdog-skill.sh" ]]; then
	"$ROOT/ops/tooling/install-watchdog-skill.sh" --quiet >/dev/null 2>&1 || true
fi
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

ensure_json="{}"
ensure_rc=0
if [[ -x "$ROOT/ops/tooling/watchdog-ensure-armed.sh" ]]; then
	ensure_json="$("$ROOT/ops/tooling/watchdog-ensure-armed.sh" --cue-session --json 2>>"${LOG}")" || ensure_rc=$?
else
	ensure_rc=2
	ensure_json='{"armed":false,"host_capable":true,"summary":"missing watchdog-ensure-armed.sh"}'
fi
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "session ensure_rc=${ensure_rc} ${ensure_json}" >>"${LOG}" 2>/dev/null || true

export PEM_HOOK_GRAPHIFY="$graphify_status"
export PEM_HOOK_SKILL="$skill"
export PEM_HOOK_SOFT_STATE="$soft_state"
export PEM_HOOK_SUB_STATE="$sub_state"
export PEM_HOOK_ENSURE_JSON="$ensure_json"
export PEM_HOOK_ENSURE_RC="$ensure_rc"

node <<'NODE' 2>/dev/null || printf '%s\n' '{}'
let ensure = {};
try { ensure = JSON.parse(process.env.PEM_HOOK_ENSURE_JSON || '{}'); } catch { ensure = {}; }
const armed = !!ensure.armed;
const host = ensure.host_capable !== false;
const softA = ensure.softlock?.active ? '1' : '0';
const softE = ensure.softlock?.enabled ? '1' : '0';
const subA = ensure.subagent?.active ? '1' : '0';
const subE = ensure.subagent?.enabled ? '1' : '0';
const cue = ensure.cue?.fired ? '1' : '0';
const cueSkip = ensure.cue?.skipped || '';
const lines = [
  '[portfolio sessionStart hooks — watchdog auto-arm]',
  `- Graphify: prefer query|path|explain before wide Grep. Ensure status=${process.env.PEM_HOOK_GRAPHIFY}.`,
  `- Softlock: ALWAYS ON. Never stop/restart for worker churn. active=${softA} enabled=${softE}.`,
  `- Subagent: forever pem-subagent-watchdog (idle skip). active=${subA} enabled=${subE}. Prefer idle-skip over stop/start.`,
  `- Armed=${armed} cue_fired=${cue}${cueSkip ? ` cue_skip=${cueSkip}` : ''}. Session cue once (stamp); never per-spawn.`,
  `- NEVER: reinstall/restart units when already active; stop softlock; unsubscribe timer while workers still alive (check live count → 0 first).`,
  `- Cloud coordinators: host systemd unreachable — arm subscribe_timer pem-subagent-watchdog delaySeconds=60 on first worker; unsubscribe only when active workers=0. Host forever-loop covers Raider.`,
  `- Params: ${process.env.PEM_HOOK_SKILL} · status: ./bin/agent-cli watchdog · ensure: ./ops/tooling/watchdog-ensure-armed.sh --json`,
  `- Verify cue: ~/.local/state/pem-watchdog-ensure/session-cue.stamp + desktop notify "PEM watchdogs armed".`,
];
if (host && !armed) {
  lines.unshift(
    'HARD FAIL — watchdog units NOT armed on this host. Run: ./ops/diagnostics/install-host-softlock-watch.sh && ./ops/tooling/subagent-watchdog/install-loop.sh — then ./ops/tooling/watchdog-ensure-armed.sh --cue-session --json. Do not spawn workers until armed=true. Softlock must stay on; subagent unit must stay enabled (idle-skip OK).'
  );
} else if (!host) {
  lines.push('- Host units N/A here (no systemctl). Coordinator must subscribe_timer while workers active.');
}
process.stdout.write(JSON.stringify({
  env: {
    PEM_WATCHDOG_SKILL: process.env.PEM_HOOK_SKILL,
    PEM_SOFTLOCK_STATE: process.env.PEM_HOOK_SOFT_STATE,
    PEM_SUBAGENT_WATCHDOG_STATE: process.env.PEM_HOOK_SUB_STATE,
    PEM_GRAPHIFY_SESSION: process.env.PEM_HOOK_GRAPHIFY,
    PEM_SOFTLOCK_ACTIVE: softA,
    PEM_SOFTLOCK_ENABLED: softE,
    PEM_SUBAGENT_ACTIVE: subA,
    PEM_SUBAGENT_ENABLED: subE,
    PEM_WATCHDOG_ARMED: armed ? '1' : '0',
    PEM_WATCHDOG_CUE_FIRED: cue,
  },
  additional_context: lines.join('\n'),
}));
NODE
exit 0
