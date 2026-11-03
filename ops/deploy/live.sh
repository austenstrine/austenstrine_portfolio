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

# Install Docker Engine + Compose plugin when missing (Ubuntu / Amazon Linux).
# After install, this SSH session may lack the docker group — use sudo then.
ensure_docker() {
	if ! command -v docker >/dev/null 2>&1; then
		echo "live.sh: Docker not found — installing Engine + Compose plugin"
		if ! command -v curl >/dev/null 2>&1; then
			if command -v apt-get >/dev/null 2>&1; then
				sudo apt-get update -y
				sudo apt-get install -y curl ca-certificates
			elif command -v dnf >/dev/null 2>&1; then
				sudo dnf install -y curl ca-certificates
			elif command -v yum >/dev/null 2>&1; then
				sudo yum install -y curl ca-certificates
			else
				echo "live.sh: curl required to install Docker; install curl and retry." >&2
				exit 1
			fi
		fi
		curl -fsSL https://get.docker.com | sudo sh
		sudo systemctl enable --now docker
		sudo usermod -aG docker "$(id -un)" || true
	fi

	if ! docker compose version >/dev/null 2>&1 && ! sudo docker compose version >/dev/null 2>&1; then
		echo "live.sh: docker compose plugin missing after install." >&2
		exit 1
	fi

	if docker info >/dev/null 2>&1; then
		DOCKER=(docker)
	elif sudo docker info >/dev/null 2>&1; then
		echo "live.sh: using sudo docker (log out/in later so group docker applies)"
		DOCKER=(sudo docker)
	else
		echo "live.sh: docker installed but daemon not reachable." >&2
		exit 1
	fi
}

ensure_docker
COMPOSE=("${DOCKER[@]}" compose -f docker-compose.yml -f docker-compose.prod.yml)

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

# Host nginx (old static portfolio) steals 80/443 from compose proxy.
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
	echo "live.sh: stopping host nginx so compose can bind 80/443"
	sudo systemctl stop nginx
	sudo systemctl disable nginx || true
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

# Warm PeM stock transforms so the first shopper is not a cold encode storm.
if [[ -d ops/cdn/data/origin/media/catalog/stock ]]; then
	echo "live.sh: prewarming CDN stock variants"
	"${COMPOSE[@]}" exec -T cdn prewarm.sh || echo "live.sh: prewarm skipped/failed (non-fatal)"
fi
