#!/usr/bin/env bash
# Install restic+rclone, wire the user systemd timer, and verify .env backup
# can run on this host. Idempotent — safe under live.sh.
#
# Secrets are NOT created here. Copy once from a machine that already backs up:
#   ./ops/deploy/push-env-backup-secrets.sh ubuntu@host
# Or place manually:
#   ~/.config/env-backup/restic.pass  (mode 600, same password as laptop)
#   ~/.config/rclone/rclone.conf      (gdrive remote)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
BACKUP_SH="$ROOT/ops/tooling/env-backup.sh"
PASS="${RESTIC_PASSWORD_FILE:-$HOME/.config/env-backup/restic.pass}"
STATE_DIR="${ENV_BACKUP_STATE_DIR:-$HOME/.config/env-backup}"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"

install_pkg() {
	local pkg="$1"
	if command -v "$pkg" >/dev/null 2>&1; then
		return 0
	fi
	echo "ensure-env-backup: installing ${pkg}"
	if command -v apt-get >/dev/null 2>&1; then
		sudo apt-get update -y
		sudo apt-get install -y "$pkg"
	elif command -v dnf >/dev/null 2>&1; then
		sudo dnf install -y "$pkg"
	elif command -v yum >/dev/null 2>&1; then
		sudo yum install -y "$pkg"
	else
		echo "ensure-env-backup: cannot install ${pkg} (no apt/dnf/yum)" >&2
		return 1
	fi
}

install_pkg restic
install_pkg rclone

mkdir -p "$STATE_DIR" "$UNIT_DIR"
chmod 700 "$STATE_DIR"

# Point the timer at this checkout (not ~/bin/… which may not exist on EC2).
cat > "$UNIT_DIR/env-backup.service" <<EOF
[Unit]
Description=Encrypted .env backup to Google Drive (restic)
After=network-online.target

[Service]
Type=oneshot
ExecStart=${BACKUP_SH} backup
Nice=10
EOF

cp "$ROOT/ops/tooling/env-backup.timer" "$UNIT_DIR/env-backup.timer"

if command -v systemctl >/dev/null 2>&1; then
	# User lingering so the timer fires without an interactive login.
	if command -v loginctl >/dev/null 2>&1; then
		sudo loginctl enable-linger "$(id -un)" 2>/dev/null || true
	fi
	systemctl --user daemon-reload
	systemctl --user enable --now env-backup.timer
	echo "ensure-env-backup: enabled user timer env-backup.timer → ${BACKUP_SH}"
fi

if [[ ! -f "$PASS" ]]; then
	echo "ensure-env-backup: missing ${PASS}" >&2
	echo "  Copy from laptop: ./ops/deploy/push-env-backup-secrets.sh user@host" >&2
	echo "  See docs/tooling/env-backup.md" >&2
	exit 0
fi

if ! rclone lsd gdrive: >/dev/null 2>&1; then
	echo "ensure-env-backup: rclone gdrive: not usable (check ~/.config/rclone/rclone.conf)" >&2
	exit 0
fi

echo "ensure-env-backup: running backup smoke test"
bash "$BACKUP_SH" backup
echo "ensure-env-backup: ok"
