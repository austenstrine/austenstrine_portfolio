#!/usr/bin/env bash
# Publish repo watchdog skill → ~/.agents/skills/watchdog/SKILL.md (canonical host path).
# Fail-open when HOME unwritable. Idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRC="${WATCHDOG_SKILL_SRC:-$ROOT/.cursor/skills/watchdog/SKILL.md}"
DEST_DIR="${WATCHDOG_SKILL_DIR:-$HOME/.agents/skills/watchdog}"
DEST="${DEST_DIR}/SKILL.md"
QUIET=0
for a in "$@"; do
	case "$a" in
		-q|--quiet) QUIET=1 ;;
		-h|--help|help)
			cat <<'EOF'
Usage: ops/tooling/install-watchdog-skill.sh [--quiet]
Copies .cursor/skills/watchdog/SKILL.md → ~/.agents/skills/watchdog/SKILL.md
EOF
			exit 0
			;;
		*) echo "install-watchdog-skill: unknown arg: $a" >&2; exit 2 ;;
	esac
done

log() { [[ "$QUIET" -eq 1 ]] || echo "$@"; }

[[ -f "$SRC" ]] || {
	log "install-watchdog-skill: skip (missing $SRC)"
	exit 0
}
[[ -n "${HOME:-}" ]] || {
	log "install-watchdog-skill: skip (no HOME)"
	exit 0
}

mkdir -p "$DEST_DIR" || {
	log "install-watchdog-skill: skip (cannot mkdir $DEST_DIR)"
	exit 0
}
install -m 0644 "$SRC" "$DEST" || {
	log "install-watchdog-skill: skip (cannot write $DEST)"
	exit 0
}
log "install-watchdog-skill: $DEST ← $SRC"
