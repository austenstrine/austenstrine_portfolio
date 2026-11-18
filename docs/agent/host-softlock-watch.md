# Host softlock watchdog

Kernel soft lockup + hung `cursorsandbox --preflight-only` killer. **Not** the subagent stuck-loop poll.

**Skill (canonical params):** `~/.agents/skills/watchdog/SKILL.md`  
**Start:** project `sessionStart` hook checks liveness; install script enables systemd so softlock **stays on**.

## Start (stays on)

```bash
./ops/diagnostics/install-host-softlock-watch.sh
# or manually:
install -m 0755 ops/diagnostics/host-softlock-watch.sh ~/.local/bin/host-softlock-watch
install -m 0644 ops/diagnostics/host-softlock-watch.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now host-softlock-watch.service
```

Check: `systemctl --user status host-softlock-watch.service`

Defaults: poll every **5s**; kill preflight older than **10s**; notify cooldown **60s**.

## Metrics / state

| Path | What |
|------|------|
| `~/.local/state/host-softlock-watch/` | State dir (`HOST_SOFTLOCK_STATE_DIR`) |
| `…/events.log` | Human event log |
| `…/metrics.json` | Counters: `ticks`, `soft_lockup_hits`, `preflight_kills`, `notifies`, `notify_suppressed` |
| `…/metrics.jsonl` | Structured events |
| `…/watch.pid` | Running pid |
| `…/last-check-utc.txt` | Last poll stamp |

## Vs subagent watchdog

| | Softlock | Subagent |
|--|----------|----------|
| When | Always (systemd user) | Only while ≥1 active worker (`subscribe_timer`) |
| Binary | `~/.local/bin/host-softlock-watch` | `./bin/subagent-watchdog` |
| Job | Kill hung sandbox / softlock | Nudge / rotate / pause stuck agents |
