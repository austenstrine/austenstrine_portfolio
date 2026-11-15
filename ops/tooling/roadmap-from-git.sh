#!/usr/bin/env bash
# Propose completed-roadmap rows from recent development history.
# Does NOT write apps/web/src/data/place-et-marque-roadmap.ts — print only.
# Usage: ./ops/tooling/roadmap-from-git.sh [max-commits]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
MAX="${1:-120}"

cd "$ROOT"
git fetch origin development >/dev/null 2>&1 || true

echo "# Proposed titles from origin/development (last ${MAX} subjects)"
echo "# Review, rewrite for humans, then add to place-et-marque-roadmap.ts"
echo

git log "origin/development" --pretty=format:'%s' -n "$MAX" \
	| grep -Eiv '^(Merge |Merge branch|cv:|CV |Add Simpson|Experience |Hero CTA|Update Murray|Name Glen|Flesh CV|Remove The King|Add Centro|Add 2011|Add print|Move Door|Enrich CV|Name CV|Left-align|Default Software|Frame homepage|Remove age|Rewrite CV|Mention 10|Add Refcode|Keep hash|Anchor homepage|Add dssh land|Document interactive|Drop approx|Fix experience|Allow CV|Keep Education|Sync banned|Enforce docs|Add remaining|Add Angle|Add host|Add agent-behavior|Wire fail|Close adversary|Add portfolio-prefs|Fix port-broadcast)' \
	| grep -Ei 'PEM-|manage|catalog|seller|cart|checkout|order|notif|auth|inplace|in-place|PeM|marketplace|vendor|PDP|footer|carousel|JumpToTop|frost|chrome|banner|demo|CRM|throttle|slug|invite' \
	| sed 's/^/- /'
