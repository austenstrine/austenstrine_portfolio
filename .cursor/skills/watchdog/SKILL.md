---
name: watchdog
description: >-
  Softlock + subagent stuck-loop watchdog parameters, start/stop, binaries, and
  metrics paths. Use when coordinating workers/subagents, arming host softlock
  watch, reading watchdog metrics, PEM-538/PEM-513/PEM-530, subscribe_timer
  pem-subagent-watchdog, or cursorsandbox soft lockup recovery.
---

# Watchdog (softlock + subagent)

Read this skill before changing or invoking either watchdog. Two tools:

| Tool | Job | Lifetime |
|------|-----|----------|
| **Host softlock** | Kill hung `cursorsandbox --preflight-only` / react to kernel soft lockup | Always on (systemd `--user`) |
| **Subagent stuck-loop** | Classify worker samples → nudge / force rotate / budget intervene / pause | Only while ≥1 active worker |

Do **not** conflate them. Softlock ≠ agent loop poll.

## Softlock

### Binary / unit

- Repo: `ops/diagnostics/host-softlock-watch.sh` + `host-softlock-watch.service`
- Install: `./ops/diagnostics/install-host-softlock-watch.sh`
- Live bin: `~/.local/bin/host-softlock-watch`
- Unit: `~/.config/systemd/user/host-softlock-watch.service`
- Docs: portfolio `docs/agent/host-softlock-watch.md`

### Parameters

| Param | Default | Env |
|-------|---------|-----|
| Poll interval | **5s** | `HOST_SOFTLOCK_POLL_SEC` |
| Preflight max age | **10s** | `HOST_SOFTLOCK_PREFLIGHT_MAX_AGE_SEC` |
| Notify cooldown | **60s** | `HOST_SOFTLOCK_NOTIFY_COOLDOWN_SEC` |
| State dir | `~/.local/state/host-softlock-watch` | `HOST_SOFTLOCK_STATE_DIR` |

### Start / stop

```bash
./ops/diagnostics/install-host-softlock-watch.sh   # enable --now
systemctl --user status host-softlock-watch.service
systemctl --user stop host-softlock-watch.service  # rare; keep on by default
```

Softlock **stays on** across agent sessions. Do not leave it uninstalled after a softlock incident.

### Metrics

| File | Contents |
|------|----------|
| `…/metrics.json` | `ticks`, `soft_lockup_hits`, `preflight_kills`, `notifies`, `notify_suppressed` |
| `…/metrics.jsonl` | Structured events |
| `…/events.log` | Human log |
| `…/watch.pid`, `last-check-utc.txt`, `started-utc.txt` | Liveness |

## Subagent stuck-loop

### Binary

- Prefer: portfolio `./bin/subagent-watchdog` → `ops/tooling/subagent-watchdog/watchdog.sh` + `classify.mjs`
- Status: `./bin/agent-cli watchdog`
- Docs: `docs/agent/subagent-watchdog.md` · Project `workflows/subagent-watchdog.md`
- Store fallback: Project `scripts/subagent-watchdog.sh` (delegates to portfolio bin when present)

### Rules (canonical)

| Rule | Value |
|------|-------|
| Poll | every **1 min** while ≥1 active worker/subagent; else timer **off** |
| Same strategy, slight tweaks | intervene at **4+** |
| Slight variations | max **3**, then force **very different** approach |
| Very-different failures | **3** → pause worker + ask Project coordinator; stay paused until plan |
| Budgets (wall) | tiny **&lt;3m**, medium **&lt;7m**, big **&lt;15m** → intervene |

Actions: `ok` | `nudge` | `force_rotate` | `budget_intervene` | `pause_escalate`.

### Start / stop

**Host keep-alive (Raider / local AgentOps):**

```bash
./ops/tooling/subagent-watchdog/install-loop.sh
# unit: pem-subagent-watchdog.service → ~/.local/bin/pem-subagent-watchdog-loop
# Drop live sample at ~/.local/state/subagent-watchdog/sample.json (else empty heartbeat tick)
systemctl --user status pem-subagent-watchdog.service
```

**Coordinator timer (still valid when hooks/MCP available):**

1. First worker spawn → `subscribe_timer` name `pem-subagent-watchdog`, `delaySeconds: 60`.
2. Each fire → build sample → `./bin/subagent-watchdog tick --sample …` → apply `actions` via `SendToAgent` / pause.
3. `should_poll=false` → `unsubscribe` timer. **Do not leave timer forgotten** when no workers active.

Classify rules (strategy flip / budgets) always apply on every `tick`, whether loop or timer.

### Metrics / state

Default dir: `~/.local/state/subagent-watchdog/` (`SUBAGENT_WATCHDOG_DIR`).

| File | Contents |
|------|----------|
| `metrics.json` | `ticks`, `strategy_flips`, `budget_breaches`, `intervenes` (+ nudges / pause_escalates / ok) |
| `metrics.jsonl` | Append-only per-tick events |
| `last-tick.json` | Last classify JSON |
| `worker-*.json` | Fingerprints / slight counts |

```bash
./bin/subagent-watchdog tick --sample ops/tooling/subagent-watchdog/fixtures/loop-sample.json
./bin/subagent-watchdog metrics
./bin/subagent-watchdog reset            # worker state only; metrics kept
```

## Hooks (prefer over prose)

Portfolio project hooks (`.cursor/hooks.json`) enforce must-every-time start:

| Event | Script | Does |
|-------|--------|------|
| `sessionStart` | `.cursor/hooks/session-start.sh` | `install-graphify-hooks` + `graphify-ensure`; softlock liveness; inject start hints + env |
| `subagentStart` | `.cursor/hooks/subagent-start-watchdog.sh` | Allow + remind arm timer / ensure loop unit |
| `postToolUse` (`Task`) | `.cursor/hooks/post-tool-watchdog.sh` | `additional_context` arm/stop reminder |
| Git `post-merge` / `post-checkout` | `ops/tooling/git-hooks/*` (via `install-graphify-hooks.sh`) | Refresh graphify after checkout/merge |
| systemd `host-softlock-watch` | install script | Softlock stays on |
| systemd `pem-subagent-watchdog` | `install-loop.sh` | Subagent loop stays on (60s) |

Skill keeps **parameters/rules/paths**. Hooks keep **when to start**. Do not re-litigate cadence in always-on rules.

## Agent duty

- Softlock missing/disabled on Austen host after softlock risk → install/enable.
- Coordinators with active workers → arm `pem-subagent-watchdog` timer; stop when idle.
- Claims about measured AgentOps → cite `metrics.json` / `metrics.jsonl` paths above (PEM-538 closed the “spec without binary/metrics” gap).
