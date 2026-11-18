# Local stack bring-up (`dssh launch`)

Keep in sync with Place et Marque `workflows/dssh-launch-stack.md`.

## Prefer

```bash
cd ~/Development/austenstrine_portfolio
dssh launch                 # preferred
dssh launch --dry-run       # map + launcher dry-run (no GUI)
dssh launch --map-only      # refresh map only
```

- Consumer wiring: `.dsshrc` `dssh_launch_local=./scripts/dssh-launch` (portfolio paths stay in consumer config, not the generic dssh tool).
- Port map: Project store `internal/port-broadcast-stack-map.md` (and local `ops/diagnostics/…`).
- App `start`/`restart`: detach by default; follow with `dssh logs <target>` (global action form).
- CLI-level launch is already serialized; compose create/build uses `COMPOSE_PARALLEL_LIMIT=1` by default (dssh + launch export).

## Build throttle (after cache clear)

| Cap | Default |
|-----|---------|
| `COMPOSE_PARALLEL_LIMIT` | `1` |
| `BUILDKIT_MAX_PARALLELISM` | `1` |
| `DOCKER_BUILDKIT` | `1` |
| App image order | `backend` → `frontend` → `crm` (launch prebuild; tabs use `-nobuild`) |
| Optional BuildKit solver | buildx builder `dssh-throttle` + `examples/buildkitd-throttle.toml` (`max-parallelism=1`); `DSSH_ENSURE_THROTTLE_BUILDER=1` once when stall clear |

Skip ordered prebuild: `dssh launch --skip-prebuild` or `DSSH_LAUNCH_SKIP_PREBUILD=1` (tabs still `-nobuild` — images must already exist).

## Stall gate (D-state / RCU)

Before launch (including `--dry-run`) and before each prebuild step, refuse if host softlock watch elevated:

- Flag: `~/.local/state/host-softlock-watch/stall-elevated` or `docker-pileon-pause`
- Status: `…/status.json` (`./bin/agent-cli watchdog`)
- Override (dangerous): `dssh launch --ignore-stall` or `DSSH_LAUNCH_IGNORE_STALL=1`

Do not pile on docker create/build during stalls; never SIGKILL D-state. Softlock caution: wait for `elevated=0` before heavy rebuilds.

## Six tabs

`rlog` (`dssh rlog up; dssh logs rlog`), then `restart; logs` for `proxy` / `cdn`, and `restart -nobuild; logs` for `backend` / `frontend` / `crm` (images from launch prebuild).

## Backend / CRM replace

Individual Nest/CRM restarts still follow `docs/agent/dssh-backend-ownership.md` (user Cursor terminal pattern).

## Do not

- Call the raw port-broadcast launcher by hand for routine bring-up when `dssh launch` works.
- Bake portfolio stack paths into the generic dssh tool.
- Leave a long-running watch after launch — refresh the map, then exit.
- Force launch during elevated D-state/RCU without an explicit ignore.
