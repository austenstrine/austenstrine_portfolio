# Host softlock watchdog

Kernel soft lockup + hung `cursorsandbox --preflight-only` killer, plus **D-state / RCU stall** detection (glycin/bwrap/runc/docker-proxy/kworker netns patterns; journal/dmesg RCU / expedited / `synchronize_rcu_expedited`). **Not** the subagent stuck-loop poll.

Classic soft lockup watch alone missed Raider stalls where softlock hits stayed 0 while D-state / RCU climbed — this watch covers that class.

**Skill (canonical params):** `~/.agents/skills/watchdog/SKILL.md`  
**Start:** `sessionStart` / Task / subagentStart hooks call `ops/tooling/watchdog-ensure-armed.sh` (enable `--now` only if inactive; **never** restart/stop for worker churn). Install script enables systemd so softlock **stays on**.  
**Start cue:** daemon start **or** session (`session-start` clears stamp only after cooldown → `--cue-session`). Hard rate-limit **3600s** (`WATCHDOG_START_CUE_COOLDOWN_SEC`) via `last-cue.utc`. `--json` alone does not cue. Not every 5s poll / CreateAgent. Incident `notify-send -u critical` path stays separate.

## Start (stays on)

```bash
./ops/diagnostics/install-host-softlock-watch.sh
# or manually:
install -m 0755 ops/diagnostics/host-softlock-watch.sh ~/.local/bin/host-softlock-watch
install -m 0755 ops/tooling/watchdog-start-cue.sh ~/.local/bin/watchdog-start-cue
install -m 0644 ops/diagnostics/host-softlock-watch.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now host-softlock-watch.service
```

Check: `systemctl --user status host-softlock-watch.service`  
Agent peek: `./bin/agent-cli watchdog` → `status.json` / `stall-elevated`  
**Caution:** confirm softlock clear (`elevated=0`) before restart/reinstall when possible.

Defaults: poll every **5s**; kill preflight older than **10s**; notify cooldown **60s**; D-state min **2** / stuck **3** polls; clear after **3** clean polls.

## Detection

| Signal | Source | Action |
|--------|--------|--------|
| Soft lockup | `journalctl -k` `BUG: soft lockup` | Kill hung preflight; elevate |
| Hung preflight | `cursorsandbox --preflight-only` age ≥ max | SIGKILL preflight (+ non-D bwrap) |
| Rising/stuck D-state | `ps` D* matching glycin/bwrap/runc/docker-proxy/containerd-shim/dockerd/kworker netns | Elevate; metrics |
| RCU stall | journal/dmesg RCU / expedited / `synchronize_rcu_expedited` | Elevate; metrics |

**Caution:** never SIGKILL D-state (useless). Optional pile-on stop = SIGTERM **non-D** `docker build` / `compose create|up|build` only. Agents/dssh read `stall-elevated` / `status.json` and refuse new create/build.

## Metrics / state

| Path | What |
|------|------|
| `~/.local/state/host-softlock-watch/` | State dir (`HOST_SOFTLOCK_STATE_DIR`) |
| `…/status.json` | Agent-facing: `ok`, `elevated`, `reasons`, `d_state_*`, `rcu_recent`, `docker_pileon_paused`, `agent_hint` |
| `…/stall-elevated` | Presence = elevated (shell-friendly) |
| `…/docker-pileon-pause` | Presence = pause new docker create/build |
| orphan pause | Cleared on watch **start** and after **CLEAR_POLLS** clean polls even if this process never elevated (reboot residue); re-touched if still elevated |
| `…/events.log` | Human event log |
| `…/metrics.json` | `ticks`, `soft_lockup_hits`, `d_state_hits`, `rcu_stall_hits`, `docker_pileon_stops`, `preflight_kills`, `notifies`, `notify_suppressed` |
| `…/metrics.jsonl` | Structured events |
| `…/watch.pid` | Running pid |
| `…/last-check-utc.txt` | Last poll stamp |

Env knobs: `HOST_SOFTLOCK_D_STATE_MIN`, `HOST_SOFTLOCK_D_STATE_STUCK_POLLS`, `HOST_SOFTLOCK_CLEAR_POLLS`, `HOST_SOFTLOCK_DOCKER_PILEON` (`0` = status only), `HOST_SOFTLOCK_D_STATE_RE`.

## Vs subagent watchdog

| | Softlock | Subagent |
|--|----------|----------|
| When | Always (systemd user) | Forever keep-alive OK; **ticks only while ≥1 active worker** (idle skip) |
| Binary | `~/.local/bin/host-softlock-watch` | `./bin/subagent-watchdog` |
| Job | Softlock + D/RCU stall surface; kill hung sandbox | Nudge / rotate / pause stuck agents |
