#!/usr/bin/env bash
# Wire post-merge/post-checkout → graphify-ensure (works with Cursor agent-hooks overlay).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
mkdir -p .git/hooks
ln -sfn ../../ops/tooling/git-hooks/post-merge .git/hooks/post-merge
ln -sfn ../../ops/tooling/git-hooks/post-checkout .git/hooks/post-checkout
echo "install-graphify-hooks: linked .git/hooks/post-{merge,checkout} → ops/tooling/git-hooks/"
echo "  (Cursor core.hooksPath overlay still runs .git/hooks via .cursor-original-hooks-path)"
