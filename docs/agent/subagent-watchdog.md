# Subagent stuck-loop watchdog

Coordinator-side poll + classify. **Params skill:** `~/.agents/skills/watchdog/SKILL.md` (install: `./ops/tooling/install-watchdog-skill.sh`; repo mirror `.cursor/skills/watchdog/`). **Start rules:** project hooks (`.cursor/hooks.json` — `sessionStart` / `subagentStart` / `postToolUse` Task) beat prose.

Canonical Project SOP also lives in Place et Marque store: `workflows/subagent-watchdog.md` (keep aligned: forever host loop is OK when **idle-aware** — no tick/metrics when no workers).

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

**Start cue:** once on loop process start / enable / restart — desktop `notify-send` + short system sound (`ops/tooling/watchdog-start-cue.sh`). Idle skips and classify ticks do **not** cue. Disable: `WATCHDOG_START_CUE=0`.

**Coordinator timer (optional when MCP timer available):**

1. On first worker/subagent spawn: `subscribe_timer` name `pem-subagent-watchdog`, `delaySeconds: 60`.
2. Each fire: build sample, run `tick`, apply `actions` via `SendToAgent` / pause.
3. If `should_poll=false`: `unsubscribe` the timer — do not leave forgotten.

Host softlock (separate): `ops/diagnostics/install-host-softlock-watch.sh`.

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
