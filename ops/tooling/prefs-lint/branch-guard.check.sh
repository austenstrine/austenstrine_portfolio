#!/usr/bin/env bash
# C1: refuse ordinary commits on master/main/development.
# Enforced when PREFS_LINT_HOOK=1 (optional local pre-commit). Suite on integration/CI skips.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"
branch=$(git branch --show-current 2>/dev/null || true)
if [[ -z "$branch" ]]; then
	echo "branch-guard: skip (detached HEAD)"
	exit 0
fi
case "$branch" in
	master|main|development)
		git_dir=$(git rev-parse --git-dir)
		if [[ -f "$git_dir/MERGE_HEAD" ]]; then
			echo "branch-guard: ok (merge onto $branch)"
			exit 0
		fi
		if [[ "${PREFS_LINT_ALLOW_INTEGRATION:-}" == "1" || "${PREFS_LINT_ALLOW_DEVELOPMENT:-}" == "1" ]]; then
			echo "branch-guard: ok (allow on $branch)"
			exit 0
		fi
		if [[ "${PREFS_LINT_HOOK:-}" != "1" ]]; then
			echo "branch-guard: skip (not in commit-hook context on $branch)"
			exit 0
		fi
		echo "branch-guard: FAIL: commit on '$branch' - use feature/<user>/<target>/<name> or swarm tip, then merge" >&2
		exit 1
		;;
	*)
		echo "branch-guard: ok ($branch)"
		exit 0
		;;
esac
