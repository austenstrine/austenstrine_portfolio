# port-broadcast (delegated)

Canonical tooling moved to **[austenstrine/port-broadcast-bash](https://github.com/austenstrine/port-broadcast-bash)**.

Local checkout (Raider): `~/Development/port-broadcast-bash`

## This repo keeps

- Thin wrappers: `scripts/port-broadcast-shell`, `scripts/port-broadcast-launcher`
  - `exec` the new repo’s `bin/` (override with `PORT_BROADCAST_HOME`)
- Optional Cursor tasks in `.vscode/tasks.json` that call those wrappers (hop stays one click from the portfolio workspace)

## Prefer opening the new repo for tasks

Open `~/Development/port-broadcast-bash` (or add it to a multi-root workspace) and run:

- **Tasks: Run Task** → `port-broadcast: smoke`
- **Tasks: Run Task** → `port-broadcast: 6 tabs`

```bash
~/Development/port-broadcast-bash/bin/port-broadcast-launcher --smoke
nc 127.0.0.1 4591
```
