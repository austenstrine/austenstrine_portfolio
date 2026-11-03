#!/usr/bin/env bash
# Bring up the single-box Nest + Next + OpenSearch stack (EC2 t3a.large x86_64).
# Dashboards stay off (no --profile dashboards).
#
# Rolling by design: build first, then replace one service at a time so
# nginx+web+api are never all stopped together. Brief blip only on the
# service being replaced.
#
# Build on the box. Do not copy foreign-arch node_modules or prebuilt images here.
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

# Prod target is t3a.large (x86_64). Docker should follow the host.
# Refuse DOCKER_DEFAULT_PLATFORM only when it conflicts with uname -m.
host_arch="$(uname -m)"
ddp="${DOCKER_DEFAULT_PLATFORM-}"
if [[ -n "$ddp" ]]; then
	case "$host_arch" in
		x86_64|amd64)
			if [[ "$ddp" == *arm* ]]; then
				echo "live.sh: refusing DOCKER_DEFAULT_PLATFORM=${ddp} (conflicts with host ${host_arch})." >&2
				exit 1
			fi
			;;
		aarch64|arm64)
			if [[ "$ddp" == *amd64* || "$ddp" == *x86_64* ]]; then
				echo "live.sh: refusing DOCKER_DEFAULT_PLATFORM=${ddp} (conflicts with host ${host_arch})." >&2
				exit 1
			fi
			;;
	esac
fi

case "$host_arch" in
	x86_64|amd64)
		echo "live.sh: host arch=${host_arch} (x86_64 / t3a OK)"
		;;
	*)
		echo "live.sh: WARN host arch=${host_arch} — prod box is t3a.large (x86_64). Build on that box; do not ship cross-arch images or node_modules." >&2
		;;
esac

if [[ ! -f "$ROOT/.env" ]]; then
	echo "live.sh: missing $ROOT/.env — copy .env.example and fill production secrets first." >&2
	exit 1
fi

# Same encrypted .env backup as the laptop (restic → rclone gdrive:env-restic).
# Skip quietly when restic.pass is not installed yet; fail deploy if it is
# installed but backup errors. See docs/tooling/env-backup.md.
pass_file="${RESTIC_PASSWORD_FILE:-$HOME/.config/env-backup/restic.pass}"
backup_sh="$ROOT/ops/tooling/env-backup.sh"
if [[ -f "$pass_file" && -x "$backup_sh" ]]; then
	echo "live.sh: backing up .env (restic)"
	"$backup_sh" backup
elif [[ -f "$pass_file" && -f "$backup_sh" ]]; then
	echo "live.sh: backing up .env (restic)"
	bash "$backup_sh" backup
else
	echo "live.sh: skip .env backup (no $pass_file — see docs/tooling/env-backup.md)"
fi

echo "live.sh: building api web cdn nginx images (infra stays up)"
"${COMPOSE[@]}" build api web cdn nginx

echo "live.sh: ensuring infra (postgres redis opensearch)"
"${COMPOSE[@]}" up -d postgres redis opensearch

# CDN after infra, before api (uploads talk to portfolio-cdn on the
# compose network). Pull-origin web may still be rolling — fine.
echo "live.sh: rolling cdn (--no-deps)"
"${COMPOSE[@]}" up -d --no-deps cdn

echo "live.sh: rolling api (--no-deps)"
"${COMPOSE[@]}" up -d --no-deps api

echo "live.sh: applying Prisma migrations (deploy, not migrate dev)"
"${COMPOSE[@]}" run --rm --no-deps api \
	npx prisma migrate deploy --schema apps/api/prisma/schema.prisma

echo "live.sh: rolling web (--no-deps)"
"${COMPOSE[@]}" up -d --no-deps web

echo "live.sh: rolling nginx (--no-deps)"
"${COMPOSE[@]}" up -d --no-deps nginx

echo "live.sh: stack is up (OpenSearch Dashboards off; Go CDN on-box)"
"${COMPOSE[@]}" ps
