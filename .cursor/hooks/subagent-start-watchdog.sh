#!/usr/bin/env bash
# subagentStart: ensure units active (no restart if already on). Allow always.
# Fail-closed additional_context when host units inactive. No per-spawn cue.
# Softlock never stopped. Subagent: start-if-inactive only; forever idle-skip preferred.
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HOOK_DIR="$(cd "$(dirname "$0")" && pwd)"
STATE_DIR="${HOOK_DIR}/state"
mkdir -p "${STATE_DIR}" 2>/dev/null || true
LOG="${STATE_DIR}/watchdog-subagent-start.log"

cat >/dev/null 2>&1 || true

ensure_json="{}"
ensure_rc=0
# No --cue-session: cue is session-only (session-start.sh). Never per-spawn.
if [[ -x "$ROOT/ops/tooling/watchdog-ensure-armed.sh" ]]; then
	ensure_json="$("$ROOT/ops/tooling/watchdog-ensure-armed.sh" --json 2>>"${LOG}")" || ensure_rc=$?
else
	ensure_rc=2
	ensure_json='{"armed":false,"host_capable":true,"summary":"missing ensure"}'
fi
printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "subagentStart ensure_rc=${ensure_rc} ${ensure_json}" >>"${LOG}" 2>/dev/null || true

export PEM_HOOK_ENSURE_JSON="$ensure_json"
node <<'NODE' 2>/dev/null || printf '%s\n' '{"permission":"allow"}'
let ensure = {};
try { ensure = JSON.parse(process.env.PEM_HOOK_ENSURE_JSON || '{}'); } catch { ensure = {}; }
const armed = !!ensure.armed;
const host = ensure.host_capable !== false;
const lines = [
  '[watchdog hook / subagentStart]',
  'Ensure softlock + pem-subagent active (no restart if already active). Softlock always-on. Forever loop idle-skips — do NOT stop/start per CreateAgent.',
  'Optional timer: subscribe_timer pem-subagent-watchdog delaySeconds=60 ONLY if not already armed and workers≥1. Unsubscribe ONLY when live worker count hits 0 (check coordinator kids + host sample first).',
  'No start cue here (session stamp only). Params: ~/.agents/skills/watchdog/SKILL.md',
];
if (host && !armed) {
  lines.unshift(
    'HARD — units inactive. Arm: ./ops/tooling/watchdog-ensure-armed.sh --json (or install-host-softlock-watch + install-loop). Do not flap; enable --now only if inactive.'
  );
}
process.stdout.write(JSON.stringify({
  permission: 'allow',
  additional_context: lines.join(' '),
}));
NODE
exit 0
