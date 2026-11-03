# Encrypted `.env` backup (local + live)

Same pattern on the laptop and the EC2 box: **restic** encrypts the
portfolio `.env` files, **rclone** ships only ciphertext to Google Drive
folder `env-restic`. Drive never sees plaintext.

## What gets backed up

Default paths (relative to the repo that contains `ops/tooling/env-backup.sh`):

- `<repo>/.env`
- `<repo>/apps/api/.env` (skipped if missing)

Override with `ENV_BACKUP_FILES` (space-separated absolute paths) if needed.

## State on the host (not in git)

| Path | Purpose |
|------|---------|
| `~/.config/env-backup/restic.pass` | restic password (mode 600). Also keep in a password manager. |
| `~/.config/env-backup/last-hash` | skip-if-unchanged marker |
| rclone remote `gdrive:` | must already work (`rclone lsd gdrive:`) |
| restic repo `rclone:gdrive:env-restic` | shared ciphertext store |

Never commit `restic.pass`, rclone tokens, or real `.env` files.

## Commands

```bash
./ops/tooling/env-backup.sh backup
./ops/tooling/env-backup.sh snapshots
./ops/tooling/env-backup.sh restore ~/recovered-env
```

Hourly systemd user timer (units under `ops/tooling/`):

```bash
mkdir -p ~/.config/systemd/user ~/.config/env-backup
chmod 700 ~/.config/env-backup
# put restic.pass in place (mode 600), configure rclone gdrive
cp ops/tooling/env-backup.timer ~/.config/systemd/user/
# point ExecStart at this checkout's env-backup.sh
cp ops/tooling/env-backup.service ~/.config/systemd/user/
# edit ExecStart if the repo is not at ~/bin/env-backup.sh wrapper
systemctl --user daemon-reload
systemctl --user enable --now env-backup.timer
```

On the laptop, `~/bin/env-backup.sh` can wrap the repo script so the existing
timer keeps working.

## Live box

`live.sh` calls `ops/deploy/ensure-env-backup.sh`, which installs `restic` +
`rclone`, writes the user systemd timer pointed at this checkout, and smoke-tests
backup when secrets are present.

One-time secret bootstrap from a laptop that already backs up:

```bash
./ops/deploy/push-env-backup-secrets.sh
# uses prod_env_host / prod_env_key from .dsshrc.local (default key ~/.ssh/id_ed25519)
```

That copies `~/.config/env-backup/restic.pass` and `~/.config/rclone/rclone.conf`
over SSH (mode 600). Then either re-run `live.sh` or:

```bash
ssh -i ~/.ssh/id_ed25519 ubuntu@<host> 'cd /var/www/html && ./ops/deploy/ensure-env-backup.sh'
```

Manual checklist (if you prefer not to use the push helper):

1. Install `restic` + `rclone` (or let `ensure-env-backup.sh` do it).
2. Copy rclone config so `gdrive:` works as the deploy user.
3. Create `~/.config/env-backup/restic.pass` with the **same** password as the
   laptop (one shared repo). Mode 600.
4. Timer is installed by `ensure-env-backup.sh` (`ExecStart` → this repo’s
   `ops/tooling/env-backup.sh backup`).
5. `live.sh` / `dssh publish` backs up when `restic.pass` exists; if the password
   file is missing, deploy continues with a skip message.

## Remote edit + backup

`dssh rnano prod_env` opens the live `.env` over SSH (`ssh -t … nano …`).
After nano exits, dssh soft-runs the remote backup script when
`${alias}_repo` is set in `.dsshrc` (see `dssh` help). Hourly timer still
covers edits made directly on the box.
