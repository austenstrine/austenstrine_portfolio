#!/usr/bin/env bash
# Install post-merge/post-checkout → graphify-ensure.
# 1) Always link into .git/hooks (works when core.hooksPath is unset / .git/hooks).
# 2) If Cursor agent-hooks owns core.hooksPath: also add post-* → .dispatcher there.
#    Stock agent-hooks only ships pre-commit/commit-msg/prepare-commit-msg; without
#    those dispatcher entries git never invokes post-* under the overlay.
# Fail-open: missing .git / no write → exit 0.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
QUIET=0
for a in "$@"; do
	case "$a" in
		-q|--quiet) QUIET=1 ;;
		-h|--help|help)
			cat <<'EOF'
Usage: ops/tooling/install-graphify-hooks.sh [--quiet]
EOF
			exit 0
			;;
		*) echo "install-graphify-hooks: unknown arg: $a" >&2; exit 2 ;;
	esac
done

log() { [[ "$QUIET" -eq 1 ]] || echo "$@"; }

if [[ ! -d .git ]]; then
	log "install-graphify-hooks: skip (no .git)"
	exit 0
fi

mkdir -p .git/hooks || {
	log "install-graphify-hooks: skip (cannot mkdir .git/hooks)"
	exit 0
}

ln -sfn ../../ops/tooling/git-hooks/post-merge .git/hooks/post-merge
ln -sfn ../../ops/tooling/git-hooks/post-checkout .git/hooks/post-checkout
log "install-graphify-hooks: .git/hooks/post-{merge,checkout} → ops/tooling/git-hooks/"

hooks_path="$(git config --local --get core.hooksPath 2>/dev/null || true)"
[[ -z "$hooks_path" ]] && hooks_path="$(git config --get core.hooksPath 2>/dev/null || true)"

# Absolute-ize relative hooksPath
if [[ -n "$hooks_path" && "$hooks_path" != /* ]]; then
	hooks_path="$ROOT/$hooks_path"
fi

if [[ -z "$hooks_path" || "$hooks_path" == "$ROOT/.git/hooks" ]]; then
	log "install-graphify-hooks: core.hooksPath is .git/hooks (or unset) — done"
	exit 0
fi

if [[ ! -d "$hooks_path" ]]; then
	log "install-graphify-hooks: skip overlay (missing dir: $hooks_path)"
	exit 0
fi

# Cursor agent-hooks: needs named hook → .dispatcher so git invokes the overlay at all.
if [[ -x "$hooks_path/.dispatcher" ]]; then
	ln -sfn .dispatcher "$hooks_path/post-merge" 2>/dev/null || {
		log "install-graphify-hooks: warn — cannot link $hooks_path/post-merge"
		exit 0
	}
	ln -sfn .dispatcher "$hooks_path/post-checkout" 2>/dev/null || {
		log "install-graphify-hooks: warn — cannot link $hooks_path/post-checkout"
		exit 0
	}
	# Ensure original path still points at .git/hooks (dispatcher reads this).
	orig="$hooks_path/.cursor-original-hooks-path"
	if [[ -f "$orig" ]]; then
		want="$ROOT/.git/hooks"
		cur="$(tr -d '[:space:]' <"$orig" || true)"
		if [[ "$cur" != "$want" ]]; then
			log "install-graphify-hooks: note — $orig is '$cur' (expected $want)"
		fi
	fi
	log "install-graphify-hooks: Cursor overlay $hooks_path — post-{merge,checkout} → .dispatcher"
	exit 0
fi

# Non-Cursor custom hooksPath: best-effort direct symlinks into that dir.
ln -sfn "$ROOT/ops/tooling/git-hooks/post-merge" "$hooks_path/post-merge" 2>/dev/null || true
ln -sfn "$ROOT/ops/tooling/git-hooks/post-checkout" "$hooks_path/post-checkout" 2>/dev/null || true
log "install-graphify-hooks: linked into custom hooksPath $hooks_path"
