#!/usr/bin/env bash
# Bring up the single-box Nest + Next + OpenSearch stack (EC2 t3a.large x86_64).
# Dashboards stay off (no --profile dashboards).
#
# Rolling by design: build first, then replace one service at a time so
# nginx+web+api are never all stopped together. Brief blip only on the
# service being replaced.
#
# Build on the box. Do not copy foreign-arch node_modules or prebuilt images here.
#
# Idempotent host prep encoded here (wiped EC2 + fresh redeploy):
#   - Docker install
#   - stop/disable host nginx
#   - TLS: LE SAN ensure + copy into TLS_CERTS_DIR + certbot renew hook
#   - CDN origin/cache dirs + api↔cdn shared origin mount (compose)
#   - .env backup tools/timer (restic+rclone); secrets via push-env-backup-secrets.sh
#   - PeM dust banner: leave maintenance_banner_bypass unset/false on live
#   - CDN health wait + stock wait + prewarm
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

wait_http() {
	local url="$1"
	local label="$2"
	local tries="${3:-60}"
	local i
	for ((i = 1; i <= tries; i++)); do
		if "${DOCKER[@]}" exec -T "$4" wget -qO- "$url" >/dev/null 2>&1 \
			|| "${DOCKER[@]}" exec -T "$4" curl -fsS "$url" >/dev/null 2>&1; then
			echo "live.sh: ${label} ready"
			return 0
		fi
		sleep 2
	done
	echo "live.sh: ${label} not ready after $((tries * 2))s" >&2
	return 1
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

# Dust banner shows on non-local hosts unless maintenance_banner_bypass=true.
# Live must leave that flag unset/false.
if grep -Eiq '^[[:space:]]*maintenance_banner_bypass[[:space:]]*=[[:space:]]*true' "$ROOT/.env"; then
	echo "live.sh: WARN maintenance_banner_bypass=true — PeM dust banner will be hidden on live." >&2
fi

# Shared CDN origin (api seed downloads + cdn serve). Must exist before compose mounts.
mkdir -p ops/cdn/data/origin ops/cdn/data/cache
chmod -R u+rwX ops/cdn/data || true

# Go CDN source lives in austenstrine/golang-image-cdn — clone into ops/cdn/src
# before compose build (clone-in-deploy; see ops/cdn/README.md).
echo "live.sh: ensuring golang-image-cdn source"
bash "$ROOT/ops/cdn/ensure-source.sh"


# Encrypted .env backup (restic → rclone gdrive:env-restic).
# Install tools/timer always; backup runs when restic.pass exists.
# Secrets: ./ops/deploy/push-env-backup-secrets.sh from a configured laptop.
pass_file="${RESTIC_PASSWORD_FILE:-$HOME/.config/env-backup/restic.pass}"
backup_sh="$ROOT/ops/tooling/env-backup.sh"
ensure_backup="$ROOT/ops/deploy/ensure-env-backup.sh"
if [[ -x "$ensure_backup" || -f "$ensure_backup" ]]; then
	echo "live.sh: ensuring .env backup tooling"
	bash "$ensure_backup" || echo "live.sh: ensure-env-backup soft-failed (continuing)"
elif [[ -f "$pass_file" && -x "$backup_sh" ]]; then
	echo "live.sh: backing up .env (restic)"
	"$backup_sh" backup
elif [[ -f "$pass_file" && -f "$backup_sh" ]]; then
	echo "live.sh: backing up .env (restic)"
	bash "$backup_sh" backup
else
	echo "live.sh: skip .env backup (no $pass_file — see docs/tooling/env-backup.md + ops/deploy/push-env-backup-secrets.sh)"
fi

# Host nginx (old static portfolio) steals 80/443 from compose proxy.
if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
	echo "live.sh: stopping host nginx so compose can bind 80/443"
	sudo systemctl stop nginx
	sudo systemctl disable nginx || true
fi

# TLS into the path nginx mounts. Standalone obtain needs :80 free (host nginx stopped).
echo "live.sh: ensuring TLS certs in ${TLS_CERTS_DIR:-/etc/nginx/certs}"
bash "$ROOT/ops/deploy/ensure-tls.sh"

echo "live.sh: building api web cdn nginx images (infra stays up)"
"${COMPOSE[@]}" build api web cdn nginx

echo "live.sh: ensuring infra (postgres redis opensearch)"
"${COMPOSE[@]}" up -d postgres redis opensearch

# CDN after infra, before api (uploads talk to portfolio-cdn on the
# compose network). Pull-origin web may still be rolling — fine.
echo "live.sh: rolling cdn (--no-deps)"
"${COMPOSE[@]}" up -d --no-deps cdn
wait_http "http://127.0.0.1:8088/healthz" "cdn" 45 portfolio-cdn || true

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

# API OnModuleInit downloads stock into the shared origin volume. Wait briefly
# so prewarm is not a no-op on a wiped box.
STOCK_ROOT="ops/cdn/data/origin/media/catalog/stock"
echo "live.sh: waiting for catalog stock origin (api seed → shared volume)"
for ((i = 1; i <= 90; i++)); do
	if [[ -d "$STOCK_ROOT" ]] && find "$STOCK_ROOT" -type f -name 'hero.jpg' 2>/dev/null | grep -q .; then
		echo "live.sh: stock origin present"
		break
	fi
	sleep 2
	if [[ "$i" -eq 90 ]]; then
		echo "live.sh: stock origin still empty after wait (seed may still be running)"
	fi
done

if [[ -d "$STOCK_ROOT" ]] && find "$STOCK_ROOT" -type f -name 'hero.jpg' 2>/dev/null | grep -q .; then
	echo "live.sh: prewarming CDN stock variants"
	"${COMPOSE[@]}" exec -T cdn prewarm.sh || echo "live.sh: prewarm skipped/failed (non-fatal)"
else
	echo "live.sh: skip prewarm (no stock JPEGs yet)"
fi
