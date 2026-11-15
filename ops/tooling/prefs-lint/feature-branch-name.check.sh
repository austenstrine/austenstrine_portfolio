#!/usr/bin/env bash
# C2: feature/<user>/<target>/<name>, swarm tip, or cursor/*-<id> cloud template.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
branch=$(git branch --show-current 2>/dev/null || true)
if [[ -z "$branch" ]]; then
	echo "feature-branch-name: skip (detached HEAD)"
	exit 0
fi
case "$branch" in
	master|main|development)
		echo "feature-branch-name: skip (integration $branch)"
		exit 0
		;;
esac
if [[ "$branch" == "cursor/prefs-lint-swarm-e424" ]]; then
	echo "feature-branch-name: ok (swarm tip)"
	exit 0
fi
if [[ "$branch" =~ ^feature/[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*/[a-z0-9][a-z0-9_-]*$ ]]; then
	echo "feature-branch-name: ok ($branch)"
	exit 0
fi
if [[ "$branch" =~ ^cursor/[a-z0-9][a-z0-9_-]*-[0-9a-f]+$ ]]; then
	echo "feature-branch-name: ok (cloud template $branch)"
	exit 0
fi
echo "feature-branch-name: FAIL: '$branch' — want feature/<user>/<target>/<name> or cursor/prefs-lint-swarm-e424" >&2
exit 1
