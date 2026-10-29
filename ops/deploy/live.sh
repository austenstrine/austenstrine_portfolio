#!/usr/bin/env bash
# Build Next to static files and start the Nest health API.
# Existing EC2 nginx can keep serving the git checkout as the document root.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

publish_static() {
	local source="$1"
	if [[ ! -f "$source/index.html" ]]; then
		echo "live.sh: no index.html in $source" >&2
		return 1
	fi

	mkdir -p "$ROOT/www"
	rsync -a --delete "$source/" "$ROOT/www/"
	# Current austenstrine.dev serves this repo root. Copy the export there
	# without deleting apps/, .git, or other source.
	rsync -a \
		--exclude '.git' \
		--exclude 'apps' \
		--exclude 'ops' \
		--exclude 'node_modules' \
		--exclude 'package.json' \
		--exclude 'package-lock.json' \
		"$source/" "$ROOT/"
}

start_api() {
	local run_dir="${TMPDIR:-/tmp}/austenstrine-run"
	mkdir -p "$run_dir"
	if [[ -f "$run_dir/api.pid" ]]; then
		kill "$(cat "$run_dir/api.pid")" 2>/dev/null || true
		rm -f "$run_dir/api.pid"
	fi
	nohup npm run start -w apps/api >"$run_dir/api.log" 2>&1 &
	echo $! >"$run_dir/api.pid"
}

if command -v npm >/dev/null 2>&1; then
	export NODE_ENV="${NODE_ENV:-production}"
	npm ci
	npm run build
	publish_static "$ROOT/apps/web/out"
	start_api
	echo "live.sh: published Next export to $ROOT and $ROOT/www; Nest on :4000"
	exit 0
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
	docker compose up -d --build
	mkdir -p "$ROOT/www"
	docker cp portfolio-web:/usr/share/nginx/html/. "$ROOT/www/"
	publish_static "$ROOT/www"
	echo "live.sh: published Next export from Docker; Nest on :4000"
	exit 0
fi

echo "live.sh: need npm or docker compose on the host to build the Next site." >&2
exit 1
