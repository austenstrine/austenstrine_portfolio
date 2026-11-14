#!/usr/bin/env bash
# tools.port-broadcast-no-python: launcher/hop path must stay bash (no python).
# Portfolio wrappers live under scripts/; sibling tool under PORT_BROADCAST_HOME/bin.
# Fail-closed: required portfolio scripts missing → FAIL (do not skip to green).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
cd "$ROOT"

fail=0

# Non-comment python invocation on a path (python / python3 as a word).
file_has_python() {
	local f=$1
	# strip full-line comments, then look for python as a command/token
	if grep -vE '^[[:space:]]*#' "$f" | grep -nE '(^|[[:space:];|&])python3?([[:space:]]|$)' >/dev/null 2>&1; then
		return 0
	fi
	return 1
}

scan_file() {
	local f=$1
	if file_has_python "$f"; then
		echo "port-broadcast-no-python: FAIL python on launcher/hop path in $f:" >&2
		grep -nE '(^|[[:space:];|&])python3?([[:space:]]|$)' "$f" | grep -vE '^[[:space:]]*[[:digit:]]+:[[:space:]]*#' >&2 || true
		fail=1
	fi
}

# Required portfolio wrappers (real paths — not bin/*).
required=(
	scripts/port-broadcast-launcher
	scripts/port-broadcast-shell
	scripts/dssh-launch
)
for f in "${required[@]}"; do
	if [[ ! -f "$f" ]]; then
		echo "port-broadcast-no-python: FAIL missing required $f" >&2
		fail=1
		continue
	fi
	scan_file "$f"
done

# Sibling tool (where “the tool itself” lives). Optional when uncloned (CI);
# if the checkout exists, require canonical bin launcher+shell and scan them.
# Skip flood-smoke* (pref allows heavier containerized flood tests).
SIB="${PORT_BROADCAST_HOME:-$HOME/Development/port-broadcast-bash}"
if [[ -d "$SIB" ]]; then
	sib_files=(
		"$SIB/bin/port-broadcast-launcher"
		"$SIB/bin/port-broadcast-shell"
	)
	for f in "${sib_files[@]}"; do
		if [[ ! -f "$f" ]]; then
			echo "port-broadcast-no-python: FAIL sibling checkout $SIB missing $(basename "$f") (expected under bin/)" >&2
			fail=1
			continue
		fi
		scan_file "$f"
	done
else
	echo "port-broadcast-no-python: note sibling $SIB not present — scanned portfolio scripts only"
fi

if [[ "$fail" -ne 0 ]]; then
	exit 1
fi
echo "port-broadcast-no-python: ok"
