#!/usr/bin/env bash
# Angle D: host shell-timing hooks present when ~/.cursor is readable.
# Cloud VMs without user hooks: SKIP (exit 0) — documented Cursor limit.
set -euo pipefail

HOOKS_JSON="${CURSOR_HOOKS_JSON:-$HOME/.cursor/hooks.json}"
if [[ ! -r "$HOOKS_JSON" ]]; then
	echo "hooks-shell-timing: SKIP (no readable $HOOKS_JSON — cloud VM or unset home)"
	exit 0
fi

fail=0
if ! grep -q 'shell-timing' "$HOOKS_JSON"; then
	echo "hooks-shell-timing: $HOOKS_JSON missing shell-timing hook entries" >&2
	fail=1
fi

# Prefer the documented script names when present beside hooks.json
HOOKS_DIR="$(dirname "$HOOKS_JSON")/hooks"
for script in shell-timing-post.sh shell-timing-fail.sh; do
	if [[ -d "$HOOKS_DIR" && ! -x "$HOOKS_DIR/$script" ]]; then
		# Directory exists but expected wrapper missing/non-exec → fail
		if [[ -e "$HOOKS_DIR/$script" ]]; then
			echo "hooks-shell-timing: $HOOKS_DIR/$script not executable" >&2
			fail=1
		else
			echo "hooks-shell-timing: WARN missing $HOOKS_DIR/$script (hooks.json still required)" >&2
		fi
	fi
done

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "hooks-shell-timing: ok ($HOOKS_JSON)"
