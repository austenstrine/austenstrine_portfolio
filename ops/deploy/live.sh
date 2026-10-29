#!/usr/bin/env bash
# Build and run Nest + Next on the live host. No Prisma, Redis, or OpenSearch.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
	docker compose up -d --build
	exit 0
fi

export NODE_ENV="${NODE_ENV:-production}"
npm ci
npm run build

run_dir="${TMPDIR:-/tmp}/austenstrine-run"
mkdir -p "$run_dir"

stop_pid() {
	local file="$1"
	if [[ -f "$file" ]]; then
		kill "$(cat "$file")" 2>/dev/null || true
		rm -f "$file"
	fi
}

stop_pid "$run_dir/api.pid"
stop_pid "$run_dir/web.pid"

nohup npm run start -w apps/api >"$run_dir/api.log" 2>&1 &
echo $! >"$run_dir/api.pid"

nohup npm run start -w apps/web >"$run_dir/web.log" 2>&1 &
echo $! >"$run_dir/web.pid"
