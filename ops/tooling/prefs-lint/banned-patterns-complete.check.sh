#!/usr/bin/env bash
# F-C-004: banned-patterns.txt must cover all principles/banned.md machine rows (markers).
# Fail-closed without mounting the Project store — markers live in-repo.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PATTERNS="$DIR/banned-patterns.txt"
[[ -f "$PATTERNS" ]] || { echo "banned-patterns-complete: missing $PATTERNS" >&2; exit 1; }

fail=0
for n in 1 2 3 4 5 6 7 8 9; do
	if ! grep -qE "^# ban-${n}( |$)" "$PATTERNS"; then
		echo "banned-patterns-complete: missing '# ban-${n}' marker (sync with principles/banned.md)" >&2
		fail=1
	fi
done

# Spot-check high-signal tokens so emptying a section still fails
for token in 'Quietly' 'BREAKING' 'game-changing' 'Most people'; do
	if ! grep -qF "$token" "$PATTERNS"; then
		echo "banned-patterns-complete: expected pattern token missing: $token" >&2
		fail=1
	fi
done

# Triad + siren coverage (ban-7 / ban-9)
if ! grep -qE '\\.\\s\+\[A-Z\]' "$PATTERNS" && ! grep -qF '[A-Z][a-z]' "$PATTERNS"; then
	echo "banned-patterns-complete: missing triad (ban-7) pattern" >&2
	fail=1
fi
if ! grep -qF '↓' "$PATTERNS"; then
	echo "banned-patterns-complete: missing ↓ (ban-9) pattern" >&2
	fail=1
fi

[[ "$fail" -eq 0 ]] || exit 1
echo "banned-patterns-complete: ok (ban-1..9 markers)"
