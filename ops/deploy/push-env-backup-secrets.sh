#!/usr/bin/env bash
# Copy restic password + rclone config from this machine onto a live host
# so the extracted env-backup CLI (via ops/tooling/env-backup.sh wrapper /
# ensure-env-backup.sh) can run there (same shared Drive repo).
#
# The live host still needs linux-gdrive-dotenv-backup-recovery cloned or
# ENV_BACKUP_HOME set — this script only pushes secrets, not the tool.
#
# Usage:
#   ./ops/deploy/push-env-backup-secrets.sh [user@host]
# Default host: prod_env_host from .dsshrc.local / .dsshrc, else
#   ubuntu@ec2-3-18-37-158.us-east-2.compute.amazonaws.com
# Default key:  prod_env_key or ~/.ssh/id_ed25519
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

# Prefer gitignored .dsshrc.local (safe under set -u). Fall back to grepping
# committed .dsshrc for prod_env_* without sourcing (it references $script_dir).
prod_env_host=""
prod_env_key=""
if [[ -f "$ROOT/.dsshrc.local" ]]; then
	# shellcheck disable=SC1091
	source "$ROOT/.dsshrc.local"
fi
if [[ -z "${prod_env_host:-}" && -f "$ROOT/.dsshrc" ]]; then
	prod_env_host="$(grep -E '^[[:space:]]*prod_env_host=' "$ROOT/.dsshrc" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi
if [[ -z "${prod_env_key:-}" && -f "$ROOT/.dsshrc" ]]; then
	prod_env_key="$(grep -E '^[[:space:]]*prod_env_key=' "$ROOT/.dsshrc" | head -1 | cut -d= -f2- | tr -d '"' | tr -d "'" || true)"
fi

HOST="${1:-${prod_env_host:-ubuntu@ec2-3-18-37-158.us-east-2.compute.amazonaws.com}}"
KEY="${ENV_BACKUP_PUSH_KEY:-${prod_env_key:-$HOME/.ssh/id_ed25519}}"
KEY="${KEY/#\~/$HOME}"

PASS_SRC="${RESTIC_PASSWORD_FILE:-$HOME/.config/env-backup/restic.pass}"
RCLONE_SRC="${RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"

if [[ ! -f "$KEY" ]]; then
	echo "push-env-backup-secrets: SSH key not found: $KEY" >&2
	exit 1
fi
if [[ ! -f "$PASS_SRC" ]]; then
	echo "push-env-backup-secrets: missing $PASS_SRC" >&2
	exit 1
fi
if [[ ! -f "$RCLONE_SRC" ]]; then
	echo "push-env-backup-secrets: missing $RCLONE_SRC" >&2
	exit 1
fi

SSH=(ssh -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)
SCP=(scp -i "$KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)

echo "push-env-backup-secrets: → ${HOST} (key ${KEY})"
"${SSH[@]}" "$HOST" 'mkdir -p ~/.config/env-backup ~/.config/rclone && chmod 700 ~/.config/env-backup ~/.config/rclone'
"${SCP[@]}" "$PASS_SRC" "${HOST}:.config/env-backup/restic.pass"
"${SCP[@]}" "$RCLONE_SRC" "${HOST}:.config/rclone/rclone.conf"
"${SSH[@]}" "$HOST" 'chmod 600 ~/.config/env-backup/restic.pass ~/.config/rclone/rclone.conf'

echo "push-env-backup-secrets: secrets installed; run ensure-env-backup on the box (or live.sh)"
