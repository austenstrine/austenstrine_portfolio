# Subagent stuck-loop watchdog

Coordinator-side poll + classify. Canonical rules live in the Place et Marque Project store: `workflows/subagent-watchdog.md` (host mirror under `~/.local/state/cursor/agent-stores/.../bc-70187aca-…/files/workflows/`).

## Prefer

```bash
./bin/subagent-watchdog tick --sample /tmp/watchdog-sample.json
./bin/subagent-watchdog active --sample /tmp/watchdog-sample.json
./bin/subagent-watchdog reset            # clear state
./bin/subagent-watchdog reset --worker bc-…
```

## Coordinator start / stop

1. On first worker/subagent spawn: `subscribe_timer` name `pem-subagent-watchdog`, `delaySeconds: 60`.
2. Each fire: build sample (`GetAgentStatus` + `ReadAgentTranscript`, or `cursor-cloud` `list-cloud-agents` + `batch-fetch-details` `includeTranscripts`), run `tick`, apply `actions` via `SendToAgent` / pause.
3. If `should_poll=false` (no active workers): `unsubscribe` the timer.
4. No forever host daemon.

## Rules (short)

| Rule | Value |
|------|-------|
| Poll | 1 min while ≥1 active worker; else off |
| Same strategy slight tweaks | intervene at **4+** |
| Slight variations | max **3**, then force very different |
| Very-different failures | **3** → pause + ask Project coordinator |
| Budgets | tiny <3m, medium <7m, big <15m |

## Output

JSON schema `subagent-watchdog.v1`: `should_poll`, `actions[]` with `nudge` | `force_rotate` | `budget_intervene` | `pause_escalate` | `ok`, plus `send_to_agent` / `send_to_coordinator` message bodies when set.

State: `~/.local/share/subagent-watchdog/` (`SUBAGENT_WATCHDOG_DIR` override).
