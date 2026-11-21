# Subagent stuck-loop watchdog

Coordinator-side poll + classify. **Params skill:** `~/.agents/skills/watchdog/SKILL.md` (install: `./ops/tooling/install-watchdog-skill.sh`; repo mirror `.cursor/skills/watchdog/`). **Start rules:** fail-closed hooks + `ops/tooling/watchdog-ensure-armed.sh` beat prose (ensure active units; never restart when already on; session cue once).

Canonical Project SOP: Place et Marque store `workflows/subagent-watchdog.md` (forever host loop OK when **idle-aware**).

## Prefer

```bash
./ops/tooling/install-watchdog-skill.sh
./bin/subagent-watchdog tick --sample /tmp/watchdog-sample.json
./bin/subagent-watchdog active --sample /tmp/watchdog-sample.json
./bin/subagent-watchdog metrics          # durable counters
./bin/subagent-watchdog reset            # clear worker state (keeps metrics)
./bin/subagent-watchdog reset --worker bc-…
./bin/agent-cli watchdog                # status + paths + start hints
```

## Start / stop

**Host keep-alive (preferred on Raider — forever unit, idle-aware):**

```bash
./ops/tooling/subagent-watchdog/install-loop.sh
systemctl --user status pem-subagent-watchdog.service
# live sample:
# cp sample.json ~/.local/state/subagent-watchdog/sample.json
```

Loop stays enabled. **No sample / no active workers → idle skip** (sleep only; does **not** call `tick`; `metrics.ticks` unchanged). Softlock stays a separate forever unit.

**Start cue:** daemon start/restart (install) **or** session once: `session-start.sh` clears stamp then `--cue-session` fires. Stamp alone is not enough (would stick forever). `--json` alone never cues / never sets `cue.skipped`. Idle skips / ticks / CreateAgent do **not** cue. Disable: `WATCHDOG_START_CUE=0`.

**No-flap:** softlock always-on; subagent unit start-if-inactive only; unsubscribe timer only when live workers = 0; forever idle-skip preferred over stop/start.

**Coordinator timer (cloud / optional when MCP timer available):**

1. First worker: `subscribe_timer` name `pem-subagent-watchdog`, `delaySeconds: 60` (once — not per short-lived subagent).
2. Each fire: build sample, `tick`, apply `actions`.
3. Unsubscribe **only** when active workers = 0 (check coordinator kids + host sample first).

Host softlock (separate, always-on): `ops/diagnostics/install-host-softlock-watch.sh`. Auto-arm: hooks call `watchdog-ensure-armed.sh`.

## Rules (short)

| Rule | Value |
|------|-------|
| Poll | 1 min while ≥1 active worker; forever host loop idle-skips when none |
| Same strategy slight tweaks | intervene at **4+** |
| Slight variations | max **3**, then force very different |
| Very-different failures | **3** → pause + ask Project coordinator |
| Budgets | tiny <3m, medium <7m, big <15m |

## Output + metrics

JSON schema `subagent-watchdog.v1`: `should_poll`, `actions[]` with `nudge` | `force_rotate` | `budget_intervene` | `pause_escalate` | `ok`, plus `send_to_agent` / `send_to_coordinator` message bodies when set.

Durable state + metrics (PEM-538):

| Path | What |
|------|------|
| `~/.local/state/subagent-watchdog/` | Default state dir (`SUBAGENT_WATCHDOG_DIR` override) |
| `…/metrics.json` | Counters: `ticks`, `strategy_flips`, `budget_breaches`, `intervenes` |
| `…/metrics.jsonl` | Append-only tick events |
| `…/last-tick.json` | Last classify output |
| `…/worker-*.json` | Per-worker fingerprints / counts |
| `…/loop-idle-utc.txt` | Last idle skip stamp (host loop) |

Evidence smoke: `./bin/subagent-watchdog tick --sample ops/tooling/subagent-watchdog/fixtures/loop-sample.json` then `./bin/subagent-watchdog metrics`.
