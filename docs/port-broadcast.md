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

## Prefer Ptyxis stack (Linux Terminal)

```bash
# Sync sibling if needed
git -C ~/Development/port-broadcast-bash checkout master && git -C ~/Development/port-broadcast-bash pull --ff-only

./scripts/port-broadcast-launcher --dry-run --config ./scripts/port-broadcast-stack.conf --confirm
./scripts/port-broadcast-launcher --config ./scripts/port-broadcast-stack.conf --confirm
nc 127.0.0.1 4591   # rlog hop
```

## Cursor Tasks (fallback hops only)

**Tasks: Run Task** → `port-broadcast: 6 tabs` opens Cursor integrated terminals labeled `port-broadcast: rlog` … `crm` (ports 4591–4596). Those are **not** Ptyxis `--title=` tabs; use the stack conf for Austen-visible Linux Terminal titles.
