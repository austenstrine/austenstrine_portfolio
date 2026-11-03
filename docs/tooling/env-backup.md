# Encrypted `.env` backup (portfolio consumer)

Core CLI + systemd units live in
[linux-gdrive-dotenv-backup-recovery](https://github.com/austenstrine/linux-gdrive-dotenv-backup-recovery)
(install, rclone/restic, timer, restore — see that README).

This repo keeps **deploy glue only** and a thin wrapper that sets
`ENV_BACKUP_FILES` for the monorepo.

## Install the tool on a host

```bash
git clone https://github.com/austenstrine/linux-gdrive-dotenv-backup-recovery.git \
  ~/src/linux-gdrive-dotenv-backup-recovery
# optional PATH wrapper (must point at the tool, not this portfolio shim):
mkdir -p ~/bin
ln -sf ~/src/linux-gdrive-dotenv-backup-recovery/env-backup.sh ~/bin/env-backup.sh
```

Or set `ENV_BACKUP_HOME` / `ENV_BACKUP_SH`. Resolution also checks a sibling
clone (`../linux-gdrive-dotenv-backup-recovery`) and `/opt/…`.

## Portfolio files

| Path | Role |
|------|------|
| `ops/tooling/env-backup.sh` | Wrapper: sets `ENV_BACKUP_FILES`, execs extracted CLI |
| `ops/deploy/ensure-env-backup.sh` | Install restic/rclone + user timer from tool repo |
| `ops/deploy/push-env-backup-secrets.sh` | SSH-copy `restic.pass` + rclone config to live |
| `ops/deploy/live.sh` | Calls `ensure-env-backup.sh` on publish |

Default `ENV_BACKUP_FILES`: `<repo>/.env` and `<repo>/apps/api/.env`.

## Commands (via wrapper)

```bash
./ops/tooling/env-backup.sh backup
./ops/tooling/env-backup.sh snapshots
./ops/tooling/env-backup.sh restore ~/recovered-env
```

## Live box

`live.sh` calls `ops/deploy/ensure-env-backup.sh`, which expects the tool
checkout on the box, installs packages + timer, and smoke-tests backup when
secrets are present.

One-time secret bootstrap from a laptop that already backs up:

```bash
./ops/deploy/push-env-backup-secrets.sh
# uses prod_env_host / prod_env_key from .dsshrc.local (default key ~/.ssh/id_ed25519)
```

Then either re-run `live.sh` or:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@<host> 'cd /var/www/html && ./ops/deploy/ensure-env-backup.sh'
```

## Remote edit + backup

`dssh rnano prod_env` still soft-runs `ops/tooling/env-backup.sh` after nano
when `${alias}_repo` is set — the wrapper forwards to the extracted tool.
