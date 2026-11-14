# port-broadcast (delegated)

Canonical tooling moved to **[austenstrine/port-broadcast-bash](https://github.com/austenstrine/port-broadcast-bash)**.

Local checkout (Raider): `~/Development/port-broadcast-bash`  
Pinned minimum for stack tab titles: **`798a37c`** (`--tab-alias` / config `alias.N`). The portfolio wrapper refuses older siblings.

## This repo keeps

- Thin wrappers: `scripts/port-broadcast-shell`, `scripts/port-broadcast-launcher`
  - `exec` the new repo’s `bin/` (override with `PORT_BROADCAST_HOME`)
  - Launcher gates on `--tab-alias` + `PORT_BROADCAST_MIN_REV` (default `798a37c`)
- Stack config: `scripts/port-broadcast-stack.conf` (6 Ptyxis tabs titled to match each tab’s dssh name)
  - `rlog` = global dssh action (not in `dssh_targets`)
  - `proxy` / `cdn` / `backend` / `frontend` / `crm` = `dssh_targets`
- Optional Cursor tasks in `.vscode/tasks.json` — **integrated-terminal hops** with the same names; preferred multi-tab UI is still the Linux Ptyxis launcher above

## Prefer `dssh launch` (Linux Terminal)

Consumer `.dsshrc` wires `dssh_launch_local=./scripts/dssh-launch` (generic dssh
global-action hook — no portfolio paths in the dssh tool). That refreshes the
agent port map, then runs the same 6-tab launcher as below.

```bash
# Sync sibling if needed
git -C ~/Development/port-broadcast-bash checkout master && git -C ~/Development/port-broadcast-bash pull --ff-only

dssh launch                 # preferred stack bring-up
dssh launch --dry-run       # map + launcher dry-run (no GUI)
dssh launch --map-only      # refresh map only
dssh land                   # opposite of launch: rlog off + containers/infra + hop listeners
dssh land --dry-run         # print plan only

# Equivalent hand call:
./scripts/port-broadcast-launcher --dry-run --config ./scripts/port-broadcast-stack.conf --confirm
./scripts/port-broadcast-launcher --config ./scripts/port-broadcast-stack.conf --confirm
nc 127.0.0.1 4591   # rlog hop
```

### Port map (after launch)

| Path | Notes |
|------|--------|
| Place et Marque Project store `internal/port-broadcast-stack-map.md` | Preferred peek for later agents (writable under agent-stores `bc-70187aca…`) |
| `ops/diagnostics/port-broadcast-stack-map.md` | Local copy (gitignored with other diagnostics) |

Includes hop ports 4591–4596, container names (`portfolio-*`), and key URLs so a later agent can `nc` a hop if a tab crashes.

## Cursor Tasks (fallback hops only)

**Tasks: Run Task** → `port-broadcast: 6 tabs` opens Cursor integrated terminals labeled `port-broadcast: rlog` … `crm` (ports 4591–4596). Those are **not** Ptyxis `--title=` tabs; use the stack conf for Austen-visible Linux Terminal titles.
