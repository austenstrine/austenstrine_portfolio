#!/usr/bin/env bash
# C4: banned.md tells on committed/staged README/docs/PR/AGENTS; em-dash on README/PR only.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"
PATTERNS="$DIR/banned-patterns.txt"
[[ -f "$PATTERNS" ]] || { echo "banned-prose: missing banned-patterns.txt" >&2; exit 1; }

MODE=changed
if [[ "${1:-}" == "--all" ]]; then MODE=all; fi

is_chatish() {
	case "$1" in
		README|README.md|AGENTS.md) return 0 ;;
		docs/*|.github/PULL_REQUEST_TEMPLATE*|*/PULL_REQUEST_TEMPLATE*|*pr-body*) return 0 ;;
		*) return 1 ;;
	esac
}

emdash_scope() {
	case "$1" in
		README|README.md|.github/PULL_REQUEST_TEMPLATE*|*/PULL_REQUEST_TEMPLATE*|*pr-body*) return 0 ;;
		*) return 1 ;;
	esac
}

mapfile -t candidates < <(
	if [[ "$MODE" == all ]]; then
		git ls-files '*.md'
	else
		base=$(git merge-base HEAD origin/development 2>/dev/null || git merge-base HEAD development 2>/dev/null || true)
		{
			if [[ -n "${base:-}" ]]; then git diff --name-only --diff-filter=ACMR "$base"...HEAD; fi
			git diff --name-only --diff-filter=ACMR --cached
		} | sort -u
	fi
)

files=()
for f in "${candidates[@]+"${candidates[@]}"}"; do
	[[ -n "$f" && -f "$f" ]] || continue
	if is_chatish "$f"; then files+=("$f"); fi
done

if [[ ${#files[@]} -eq 0 ]]; then
	echo "banned-prose: ok (no chat-ish paths in committed/staged set)"
	exit 0
fi

export BANNED_PAT_FILE="$PATTERNS"
hits=0
for f in "${files[@]}"; do
	export BANNED_FILE="$f"
	if emdash_scope "$f"; then export BANNED_EMDASH=1; else export BANNED_EMDASH=0; fi
	if ! python3 - <<'PY'
import os, re, sys
path = os.environ["BANNED_FILE"]
pat_file = os.environ["BANNED_PAT_FILE"]
do_em = os.environ.get("BANNED_EMDASH") == "1"
patterns = []
for line in open(pat_file, encoding="utf-8"):
	line = line.strip()
	if not line or line.startswith("#"):
		continue
	patterns.append(line)
joined = "|".join("(?:%s)" % p for p in patterns)
text = open(path, encoding="utf-8", errors="replace").read()
text = re.sub(r"```.*?```", "", text, flags=re.S)
failed = 0
for i, line in enumerate(text.splitlines(), 1):
	if joined and re.search(joined, line):
		print(f"{path}:{i}: banned tell: {line.strip()[:120]}", file=sys.stderr)
		failed = 1
	if do_em and "\u2014" in line and "http" not in line:
		print(f"{path}:{i}: em-dash crutch: {line.strip()[:120]}", file=sys.stderr)
		failed = 1
sys.exit(failed)
PY
	then
		hits=$((hits + 1))
	fi
done

if [[ $hits -gt 0 ]]; then
	echo "banned-prose: FAIL ($hits file(s)) - rewrite per principles/banned.md" >&2
	exit 1
fi
echo "banned-prose: ok (${#files[@]} file(s))"
