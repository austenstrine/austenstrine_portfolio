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

1. Install `restic` + `rclone` on the EC2 host.
2. Copy rclone config (or `rclone config`) so `gdrive:` works as the same user
   that runs deploy / the timer.
3. Create `~/.config/env-backup/restic.pass` with the **same** password as the
   laptop (one shared repo). Mode 600.
4. Enable the user timer (above), with `ExecStart` → this repo’s
   `ops/tooling/env-backup.sh backup`.
5. `./ops/deploy/live.sh` / `./dssh publish` runs a backup first when
   `restic.pass` exists; if the password file is missing, deploy continues
   with a skip message.

## Remote edit + backup

`dssh rnano prod_env` opens the live `.env` over SSH (`ssh -t … nano …`).
After nano exits, dssh soft-runs the remote backup script when
`${alias}_repo` is set in `.dsshrc` (see `dssh` help). Hourly timer still
covers edits made directly on the box.
