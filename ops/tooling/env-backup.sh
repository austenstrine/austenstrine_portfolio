#!/usr/bin/env bash
# Portfolio thin wrapper → austenstrine/linux-gdrive-dotenv-backup-recovery.
# Sets ENV_BACKUP_FILES for this monorepo, then execs the extracted CLI.
#
# Install the tool (pick one):
#   git clone https://github.com/austenstrine/linux-gdrive-dotenv-backup-recovery.git \
#     ~/src/linux-gdrive-dotenv-backup-recovery
#   ln -sf ~/src/linux-gdrive-dotenv-backup-recovery/env-backup.sh ~/bin/env-backup.sh
# Or set ENV_BACKUP_HOME / ENV_BACKUP_SH.
#
# Full docs: that repo's README.md (and docs/tooling/env-backup.md here).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

resolve_env_backup_sh() {
	if [[ -n "${ENV_BACKUP_SH-}" && -f "$ENV_BACKUP_SH" ]]; then
		printf '%s\n' "$ENV_BACKUP_SH"
		return 0
	fi
	local home candidates c
	home="${ENV_BACKUP_HOME-}"
	candidates=()
	if [[ -n "$home" ]]; then
		candidates+=("$home/env-backup.sh")
	fi
	candidates+=(
		"$HOME/src/linux-gdrive-dotenv-backup-recovery/env-backup.sh"
		"$HOME/linux-gdrive-dotenv-backup-recovery/env-backup.sh"
		"$ROOT/../linux-gdrive-dotenv-backup-recovery/env-backup.sh"
		"/agent/repos/linux-gdrive-dotenv-backup-recovery/env-backup.sh"
		"/opt/linux-gdrive-dotenv-backup-recovery/env-backup.sh"
		"$HOME/bin/env-backup.sh"
	)
	for c in "${candidates[@]}"; do
		if [[ -f "$c" ]]; then
			printf '%s\n' "$c"
			return 0
		fi
	done
	return 1
}

TOOL_SH="$(resolve_env_backup_sh)" || {
	echo "env-backup: linux-gdrive-dotenv-backup-recovery not found." >&2
	echo "  Clone it and set ENV_BACKUP_HOME, or symlink env-backup.sh to ~/bin/." >&2
	echo "  See docs/tooling/env-backup.md" >&2
	exit 1
}

# Avoid infinite recursion if ~/bin/env-backup.sh points back here.
if [[ "$(cd "$(dirname "$TOOL_SH")" && pwd)/$(basename "$TOOL_SH")" == \
	"$(cd "$(dirname "$0")" && pwd)/$(basename "$0")" ]]; then
	echo "env-backup: ENV_BACKUP_SH resolves to this wrapper; point at the tool checkout." >&2
	exit 1
fi
# If TOOL_SH is a symlink into this wrapper, follow once and re-check.
if [[ -L "$TOOL_SH" ]]; then
	real="$(readlink -f "$TOOL_SH" 2>/dev/null || readlink "$TOOL_SH")"
	if [[ -n "$real" && "$(cd "$(dirname "$real")" && pwd)/$(basename "$real")" == \
		"$(cd "$(dirname "$0")" && pwd)/$(basename "$0")" ]]; then
		echo "env-backup: ~/bin (or ENV_BACKUP_SH) symlink loops to portfolio wrapper." >&2
		echo "  Symlink to the tool repo's env-backup.sh instead." >&2
		exit 1
	fi
fi

export ENV_BACKUP_FILES="${ENV_BACKUP_FILES:-$ROOT/.env $ROOT/apps/api/.env}"
exec bash "$TOOL_SH" "$@"
