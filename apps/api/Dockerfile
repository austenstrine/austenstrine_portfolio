FROM node:20-bookworm-slim
WORKDIR /app
# Avoid node:20-alpine: musl + npm lifecycle (git-dep prepare/tsc, argon2
# node-gyp-build, prisma generate) SIGSEGV during image builds.
# git: temporary until prisma-seed-migration-sync is on npm (TODO: drop git + switch dep to ^0.1.0).
# procps: nest start --watch / tree-kill spawn `ps` (bookworm-slim omits it).
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		bash \
		ca-certificates \
		git \
		g++ \
		make \
		openssl \
		procps \
		python3 \
	&& rm -rf /var/lib/apt/lists/*
COPY ops/docker/ensure-npm.sh /usr/local/bin/ensure-npm.sh
RUN chmod +x /usr/local/bin/ensure-npm.sh && ensure-npm.sh
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci
COPY . .
RUN npm run prisma:generate -w apps/api \
	&& npm run build -w apps/api
CMD ["npm", "run", "start", "-w", "apps/api"]
