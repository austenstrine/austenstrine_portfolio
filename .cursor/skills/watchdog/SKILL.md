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
| **Host softlock** | Soft lockup + hung preflight + **D-state / RCU stall** detect; pause new docker pile-on | Always on (systemd `--user`) |
| **Subagent stuck-loop** | Classify worker samples → nudge / force rotate / budget intervene / pause | Forever keep-alive unit OK; **classify ticks only while ≥1 active worker** (idle → sleep, no metrics) |

Do **not** conflate them. Softlock ≠ agent loop poll.

**Start cue (PEM-604):** (1) daemon start/enable/restart via install scripts — `notify-send` + sound; (2) **session cue once** via `ops/tooling/watchdog-ensure-armed.sh --cue-session` (stamp `~/.local/state/pem-watchdog-ensure/session-cue.stamp`). **Not** every poll/tick/idle skip / CreateAgent / Task. Helper: `ops/tooling/watchdog-start-cue.sh` → `~/.local/bin/watchdog-start-cue`. Disable: `WATCHDOG_START_CUE=0`. Titles: “PEM watchdogs armed” (session) or “Host softlock watch” / “PEM subagent watchdog” (daemon).

**Install skill (canonical host path):** `./ops/tooling/install-watchdog-skill.sh` (also from `./bin/agent-cli orient`, `sessionStart`, `install-loop.sh`). Repo mirror stays at `.cursor/skills/watchdog/SKILL.md`.

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
| D-state min count | **2** | `HOST_SOFTLOCK_D_STATE_MIN` |
| D-state stuck polls | **3** | `HOST_SOFTLOCK_D_STATE_STUCK_POLLS` |
| Clear after clean polls | **3** | `HOST_SOFTLOCK_CLEAR_POLLS` |
| Docker pile-on SIGTERM | **1** (on) | `HOST_SOFTLOCK_DOCKER_PILEON` (`0` = status only) |
| D-state pattern | glycin/bwrap/runc/docker-proxy/… | `HOST_SOFTLOCK_D_STATE_RE` |
| State dir | `~/.local/state/host-softlock-watch` | `HOST_SOFTLOCK_STATE_DIR` |

### Detection (beyond classic softlock)

| Signal | Action |
|--------|--------|
| Rising/stuck D-state on glycin/bwrap/runc/docker-proxy/kworker netns | Elevate; metrics; optional SIGTERM **non-D** docker create/build |
| journal/dmesg RCU stall / expedited / `synchronize_rcu_expedited` | Elevate; metrics |
| Soft lockup / hung preflight | Existing kill path |

**Never SIGKILL D-state.** Agents: read `status.json` / `stall-elevated`. `dssh launch` refuses when elevated (`DSSH_LAUNCH_IGNORE_STALL=1` override).

### Start / stop

```bash
./ops/diagnostics/install-host-softlock-watch.sh   # enable --now (+ start cue once)
systemctl --user status host-softlock-watch.service
systemctl --user stop host-softlock-watch.service  # rare; keep on by default
./bin/agent-cli watchdog                            # status.json / elevated peek
```

Softlock **stays on** across agent sessions. Do not leave it uninstalled after a softlock incident.

**Caution before restart:** peek `status.json` / `stall-elevated` first. Prefer clear (`elevated=0`) before `restart` / reinstall. Cue fires once on process start — not a softlock alert.

### Metrics

| File | Contents |
|------|----------|
| `…/status.json` | Agent-facing: `ok`, `elevated`, `reasons`, `d_state_*`, `rcu_recent`, `docker_pileon_paused`, `agent_hint` |
| `…/stall-elevated` | Presence = elevated (shell-friendly) |
| `…/docker-pileon-pause` | Presence = pause new docker create/build |
| orphan pause | Cleared on watch start + after CLEAR_POLLS clean polls even if process never elevated (reboot residue) |
| `…/metrics.json` | `ticks`, `soft_lockup_hits`, `d_state_hits`, `rcu_stall_hits`, `docker_pileon_stops`, `preflight_kills`, `notifies`, `notify_suppressed` |
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
| Poll | every **1 min** while ≥1 active worker; forever host loop **idle-skips** (no tick/metrics) when none; optional coordinator timer still unsubscribes when idle |
| Same strategy, slight tweaks | intervene at **4+** |
| Slight variations | max **3**, then force **very different** approach |
| Very-different failures | **3** → pause worker + ask Project coordinator; stay paused until plan |
| Budgets (wall) | tiny **&lt;3m**, medium **&lt;7m**, big **&lt;15m** → intervene |

Actions: `ok` | `nudge` | `force_rotate` | `budget_intervene` | `pause_escalate`.

### Start / stop

**Host keep-alive (preferred on Raider — forever unit, idle-aware):**

```bash
./ops/tooling/install-watchdog-skill.sh   # → ~/.agents/skills/watchdog/SKILL.md
./ops/tooling/subagent-watchdog/install-loop.sh
# unit: pem-subagent-watchdog.service → ~/.local/bin/pem-subagent-watchdog-loop
# Drop live sample at ~/.local/state/subagent-watchdog/sample.json
# No sample / no active workers → idle skip (sleep only; metrics.ticks unchanged)
# Start cue once on enable/restart (notify-send + sound); idle skips do not cue
systemctl --user status pem-subagent-watchdog.service
```

**Coordinator timer (optional when MCP timer available):**

1. First worker spawn → `subscribe_timer` name `pem-subagent-watchdog`, `delaySeconds: 60`.
2. Each fire → build sample → `./bin/subagent-watchdog tick --sample …` → apply `actions` via `SendToAgent` / pause.
3. `should_poll=false` → `unsubscribe` timer. **Do not leave timer forgotten** when no workers active.

Classify rules apply on every real `tick` only (idle host loop does not tick).

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

## Hooks (fail-closed auto-arm — prefer over prose)

| Event | Script | Does |
|-------|--------|------|
| `sessionStart` | `.cursor/hooks/session-start.sh` | `watchdog-ensure-armed.sh --cue-session --json`; HARD `additional_context` if host units inactive; session cue once |
| `subagentStart` | `.cursor/hooks/subagent-start-watchdog.sh` | ensure (no cue); HARD context if inactive; allow |
| `postToolUse` (`Task`) | `.cursor/hooks/post-tool-watchdog.sh` | ensure (no cue); HARD context if inactive |
| Ensure helper | `ops/tooling/watchdog-ensure-armed.sh` | `enable --now` **only if inactive**; never restart active; never stop softlock; never stop subagent |
| systemd softlock | install script | Softlock stays on |
| systemd pem-subagent | `install-loop.sh` | Forever keep-alive; idle skip when no workers |

### No-flap rules (async subagents)

1. Softlock **always-on** — never stop/disable/restart for worker churn.
2. Subagent unit: arm once when inactive; **do not** reinstall/restart/re-cue on every CreateAgent / short-lived subagent.
3. Before unsubscribe/stop of anything that tracks workers: check live agents (coordinator kids + host sample) — only when count **0**.
4. Session cue: **once per session** (stamp); never per-spawn.
5. Forever host loop idle-skip preferred over stop/start thrash.

### Cloud vs host

| Surface | Duty |
|---------|------|
| **Raider / host** | Hooks + `watchdog-ensure-armed.sh` keep units active; forever loop idle-skips. Austen verifies stamp + `systemctl --user is-active host-softlock-watch pem-subagent-watchdog` — no agent ask. |
| **Cloud coordinator** | Host systemd unreachable. Still `subscribe_timer` `pem-subagent-watchdog` `delaySeconds: 60` on first worker; unsubscribe **only** when active workers = 0. |

Skill keeps **parameters/rules/paths**. Hooks keep **when to arm**. Do not re-litigate cadence in always-on rules.

## Agent duty

- Softlock missing/disabled on Austen host → install/enable (then leave on).
- Prefer host forever loop with idle skip. Optional timer: arm once while workers active; unsubscribe only at zero.
- Skill missing at `~/.agents/skills/watchdog/SKILL.md` → run `./ops/tooling/install-watchdog-skill.sh`.
- Claims about measured AgentOps → cite `metrics.json` / `metrics.jsonl` paths above (PEM-538).
