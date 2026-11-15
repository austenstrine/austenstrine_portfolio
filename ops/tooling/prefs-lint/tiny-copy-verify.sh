#!/usr/bin/env bash
# Fail-closed adversary gate for tiny-copy exact drop-ins.
# ACCEPT only when: tip SHA has exact old→new in --file, lint evidence present, EOL preserved.
# Refuses missing lint wall. No --skip-lint.
#
# Usage:
#   tiny-copy-verify.sh --sha SHA --file REL --old '…' --new '…' [--repo DIR] [--lint-wall SEC]
set -euo pipefail

SHA=""
FILE_REL=""
OLD=""
NEW=""
REPO=""
LINT_WALL=""
PARENT=""

die() {
	echo "tiny-copy-verify: REJECT: $*" >&2
	exit 1
}

while [[ $# -gt 0 ]]; do
	case "$1" in
		--sha) SHA=$2; shift 2 ;;
		--file) FILE_REL=$2; shift 2 ;;
		--old) OLD=$2; shift 2 ;;
		--new) NEW=$2; shift 2 ;;
		--repo) REPO=$2; shift 2 ;;
		--lint-wall) LINT_WALL=$2; shift 2 ;;
		--parent) PARENT=$2; shift 2 ;;
		--skip-lint)
			die "--skip-lint is forbidden (fail-closed)"
			;;
		-h|--help)
			sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'
			exit 0
			;;
		*) die "unknown arg: $1" ;;
	esac
done

[[ -n "$SHA" && -n "$FILE_REL" && -n "$OLD" ]] || die "need --sha --file --old --new"
[[ -n "${NEW+x}" ]] || die "need --new"
[[ "$OLD" != "$NEW" ]] || die "old==new"

if [[ -z "$REPO" ]]; then
	if [[ -n "${PORTFOLIO_REPO:-}" ]]; then
		REPO=$PORTFOLIO_REPO
	elif [[ -f apps/web/src/app/cv/CvDocument.tsx ]]; then
		REPO=$PWD
	else
		REPO=$HOME/Development/austenstrine_portfolio
	fi
fi
REPO=$(cd "$REPO" && pwd)
cd "$REPO"

[[ -n "${LINT_WALL:-${TINY_COPY_LINT_WALL_SEC:-}}" ]] || die "missing lint_wall_sec (pass --lint-wall or TINY_COPY_LINT_WALL_SEC from script output)"
LINT_WALL=${LINT_WALL:-$TINY_COPY_LINT_WALL_SEC}

git cat-file -e "${SHA}^{commit}" 2>/dev/null || die "sha not a commit: $SHA"

if [[ -n "$PARENT" ]]; then
	BASE=$PARENT
else
	BASE=$(git rev-parse "${SHA}^")
fi

mapfile -t changed < <(git diff --name-only "$BASE" "$SHA")
if [[ ${#changed[@]} -ne 1 || "${changed[0]}" != "$FILE_REL" ]]; then
	die "diff files=[${changed[*]}] expected only $FILE_REL"
fi

export VERIFY_BASE=$BASE VERIFY_SHA=$SHA VERIFY_FILE=$FILE_REL VERIFY_OLD=$OLD VERIFY_NEW=$NEW
EOL_CHECK=$(python3 - <<'PY'
import os, subprocess, sys

def eol_kind(b: bytes) -> str:
	crlf = b.count(b"\r\n")
	bare = 0
	i = 0
	while True:
		j = b.find(b"\n", i)
		if j < 0:
			break
		if j == 0 or b[j - 1] != 0x0D:
			bare += 1
		i = j + 1
	if crlf and bare:
		return "mixed"
	if crlf:
		return "crlf"
	return "lf"

rel = os.environ["VERIFY_FILE"]
base = os.environ["VERIFY_BASE"]
sha = os.environ["VERIFY_SHA"]
old = os.environ["VERIFY_OLD"]
new = os.environ["VERIFY_NEW"]

before_b = subprocess.check_output(["git", "show", f"{base}:{rel}"])
after_b = subprocess.check_output(["git", "show", f"{sha}:{rel}"])
b_eol, a_eol = eol_kind(before_b), eol_kind(after_b)
if b_eol != a_eol:
	print(f"{b_eol}->{a_eol}", file=sys.stderr)
	sys.exit(2)

before = before_b.decode("utf-8", errors="surrogateescape")
after = after_b.decode("utf-8", errors="surrogateescape")

if before.count(old) != 1:
	print("base missing unique old", file=sys.stderr)
	sys.exit(3)
if after.count(old) != 0:
	print("tip still has old", file=sys.stderr)
	sys.exit(3)
expect = before.replace(old, new, 1)
if expect != after:
	print("tip != base.old→new (exact)", file=sys.stderr)
	sys.exit(3)
if new and after.count(new) < 1:
	print("tip missing new", file=sys.stderr)
	sys.exit(3)

print(f"{b_eol}->{a_eol}")
PY
) || {
	ec=$?
	if [[ $ec -eq 2 ]]; then
		die "EOL changed across commit — LF rewrite of CRLF is REJECT"
	fi
	die "content not exact old→new (paste-only / unique hit failed)"
}

echo "decision=ACCEPT"
echo "sha=$SHA"
echo "file=$FILE_REL"
echo "eol=$EOL_CHECK"
echo "lint_wall_sec=$LINT_WALL"
