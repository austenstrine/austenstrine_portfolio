FROM node:20-bookworm-slim
WORKDIR /app
# Avoid node:20-alpine: musl SIGSEGV during monorepo npm ci (argon2 / git-dep prepare).
RUN apt-get update \
	&& apt-get install -y --no-install-recommends \
		bash \
		ca-certificates \
		git \
		g++ \
		make \
		python3 \
	&& rm -rf /var/lib/apt/lists/*
COPY ops/docker/ensure-npm.sh /usr/local/bin/ensure-npm.sh
RUN chmod +x /usr/local/bin/ensure-npm.sh && ensure-npm.sh
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/crm/package.json ./apps/crm/
RUN npm ci
COPY . .
ARG NEXT_PUBLIC_API_BASE_URL=https://local.crm.austenstrine.dev/api
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
RUN npm run build -w apps/crm
CMD ["npm", "run", "start", "-w", "apps/crm"]
