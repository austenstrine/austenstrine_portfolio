#!/usr/bin/env bash
# Install restic+rclone, wire the user systemd timer to the extracted
# linux-gdrive-dotenv-backup-recovery CLI, and verify .env backup can run.
# Idempotent — safe under live.sh.
#
# Core CLI + units live in:
#   https://github.com/austenstrine/linux-gdrive-dotenv-backup-recovery
# Resolve via ENV_BACKUP_HOME / ENV_BACKUP_SH, sibling clone, ~/src/…, or ~/bin.
#
# Secrets are NOT created here. Copy once from a machine that already backs up:
#   ./ops/deploy/push-env-backup-secrets.sh ubuntu@host
# Or place manually:
#   ~/.config/env-backup/restic.pass  (mode 600, same password as laptop)
#   ~/.config/rclone/rclone.conf      (gdrive remote)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WRAPPER="$ROOT/ops/tooling/env-backup.sh"
PASS="${RESTIC_PASSWORD_FILE:-$HOME/.config/env-backup/restic.pass}"
STATE_DIR="${ENV_BACKUP_STATE_DIR:-$HOME/.config/env-backup}"
UNIT_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
export ENV_BACKUP_FILES="${ENV_BACKUP_FILES:-$ROOT/.env $ROOT/apps/api/.env}"

resolve_tool_home() {
	if [[ -n "${ENV_BACKUP_HOME-}" && -d "$ENV_BACKUP_HOME" ]]; then
		printf '%s\n' "$ENV_BACKUP_HOME"
		return 0
	fi
	local sh candidates c dir
	if [[ -n "${ENV_BACKUP_SH-}" && -f "$ENV_BACKUP_SH" ]]; then
		dir="$(cd "$(dirname "$ENV_BACKUP_SH")" && pwd)"
		# Prefer checkout root when script lives at repo root.
		if [[ -f "$dir/systemd/env-backup.timer" ]]; then
			printf '%s\n' "$dir"
			return 0
		fi
	fi
	candidates=(
		"$HOME/src/linux-gdrive-dotenv-backup-recovery"
		"$HOME/linux-gdrive-dotenv-backup-recovery"
		"$ROOT/../linux-gdrive-dotenv-backup-recovery"
		"/opt/linux-gdrive-dotenv-backup-recovery"
	)
	for c in "${candidates[@]}"; do
		if [[ -f "$c/env-backup.sh" && -f "$c/systemd/env-backup.timer" ]]; then
			printf '%s\n' "$c"
			return 0
		fi
	done
	# Symlink ~/bin/env-backup.sh → tool checkout
	if [[ -L "$HOME/bin/env-backup.sh" || -f "$HOME/bin/env-backup.sh" ]]; then
		sh="$(readlink -f "$HOME/bin/env-backup.sh" 2>/dev/null || true)"
		if [[ -n "$sh" && -f "$sh" ]]; then
			dir="$(cd "$(dirname "$sh")" && pwd)"
			if [[ -f "$dir/systemd/env-backup.timer" ]]; then
				printf '%s\n' "$dir"
				return 0
			fi
		fi
	fi
	return 1
}

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

TOOL_HOME="$(resolve_tool_home)" || {
	echo "ensure-env-backup: linux-gdrive-dotenv-backup-recovery not found." >&2
	echo "  git clone https://github.com/austenstrine/linux-gdrive-dotenv-backup-recovery.git \\" >&2
	echo "    ~/src/linux-gdrive-dotenv-backup-recovery" >&2
	echo "  Or set ENV_BACKUP_HOME / ENV_BACKUP_SH. See docs/tooling/env-backup.md" >&2
	exit 0
}

BACKUP_SH="$TOOL_HOME/env-backup.sh"
TIMER_SRC="$TOOL_HOME/systemd/env-backup.timer"

install_pkg restic
install_pkg rclone

mkdir -p "$STATE_DIR" "$UNIT_DIR"
chmod 700 "$STATE_DIR"

# Point the timer at the extracted CLI with this monorepo's file list.
# Quote ENV_BACKUP_FILES so systemd keeps space-separated paths as one value.
cat > "$UNIT_DIR/env-backup.service" <<EOF
[Unit]
Description=Encrypted .env backup to Google Drive (restic)
After=network-online.target

[Service]
Type=oneshot
Environment="ENV_BACKUP_FILES=${ENV_BACKUP_FILES}"
ExecStart=${BACKUP_SH} backup
Nice=10
EOF

cp "$TIMER_SRC" "$UNIT_DIR/env-backup.timer"

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
# Prefer portfolio wrapper (sets ENV_BACKUP_FILES); fall back to tool directly.
if [[ -f "$WRAPPER" ]]; then
	bash "$WRAPPER" backup
else
	bash "$BACKUP_SH" backup
fi
echo "ensure-env-backup: ok"
