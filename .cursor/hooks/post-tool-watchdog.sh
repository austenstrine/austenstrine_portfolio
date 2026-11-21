#!/usr/bin/env bash
# postToolUse (Task): ensure units (no flap) + hard additional_context when inactive.
# No per-spawn cue. Remind: unsubscribe only when workers=0.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${HOOK_DIR}/state"
mkdir -p "${STATE_DIR}" 2>/dev/null || true
LOG="${STATE_DIR}/watchdog-task.log"

cat >/dev/null 2>&1 || true

ensure_json="{}"
ensure_rc=0
if [[ -x "$ROOT/ops/tooling/watchdog-ensure-armed.sh" ]]; then
	ensure_json="$("$ROOT/ops/tooling/watchdog-ensure-armed.sh" --json 2>>"${LOG}")" || ensure_rc=$?
else
	ensure_rc=2
	ensure_json='{"armed":false,"host_capable":true,"summary":"missing ensure"}'
fi
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "Task ensure_rc=${ensure_rc} ${ensure_json}" >>"${LOG}" 2>/dev/null || true

export PEM_HOOK_ENSURE_JSON="$ensure_json"
node <<'NODE' 2>/dev/null || printf '%s\n' '{}'
let ensure = {};
try { ensure = JSON.parse(process.env.PEM_HOOK_ENSURE_JSON || '{}'); } catch { ensure = {}; }
const armed = !!ensure.armed;
const host = ensure.host_capable !== false;
const lines = [
  '[watchdog hook / Task]',
  'After spawn: units must stay armed (ensure --json). Softlock always-on — never stop for worker churn.',
  'Subagent: forever idle-aware loop preferred; do NOT reinstall/restart/re-cue per Task/CreateAgent.',
  'Timer (cloud/optional): arm once on first worker; before unsubscribe check live agents still >0 — stop only at zero.',
  'Session cue once max (stamp). Softlock separate forever. Params: ~/.agents/skills/watchdog/SKILL.md · ./bin/agent-cli watchdog',
];
if (host && !armed) {
  lines.unshift(
    'HARD — softlock/pem-subagent NOT active. Run ./ops/tooling/watchdog-ensure-armed.sh --json. Install only if units missing. Never restart when already active.'
  );
}
process.stdout.write(JSON.stringify({
  additional_context: lines.join(' '),
}));
NODE
exit 0
