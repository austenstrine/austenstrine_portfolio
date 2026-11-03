#!/usr/bin/env bash
# Bring up the Lightsail / single-box Nest + Next + OpenSearch stack.
# Dashboards stay off (no --profile dashboards).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

if ! command -v docker >/dev/null 2>&1; then
	echo "live.sh: docker is required on the host." >&2
	exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
	echo "live.sh: docker compose plugin is required on the host." >&2
	exit 1
fi

if [[ ! -f "$ROOT/.env" ]]; then
	echo "live.sh: missing $ROOT/.env — copy .env.example and fill production secrets first." >&2
	exit 1
fi

echo "live.sh: building and starting postgres redis opensearch api web nginx"
"${COMPOSE[@]}" up -d --build postgres redis opensearch api web nginx

echo "live.sh: applying Prisma migrations (deploy, not migrate dev)"
"${COMPOSE[@]}" run --rm --no-deps api \
	npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "live.sh: stack is up (OpenSearch Dashboards off)"
"${COMPOSE[@]}" ps
