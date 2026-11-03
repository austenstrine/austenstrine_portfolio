FROM node:20-alpine
WORKDIR /app
# python3/make/g++: monorepo npm ci also builds api native deps (argon2).
RUN apk add --no-cache bash python3 make g++
COPY ops/docker/ensure-npm.sh /usr/local/bin/ensure-npm.sh
RUN chmod +x /usr/local/bin/ensure-npm.sh && ensure-npm.sh
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/prisma-seed-migration-sync/package.json ./packages/prisma-seed-migration-sync/
RUN npm ci
COPY . .
# NEXT_PUBLIC_* is inlined at build time. Pass via compose build.args / --build-arg.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
ARG NEXT_PUBLIC_CDN_URL=https://cdn.local.austenstrine.dev
ARG NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL \
	NEXT_PUBLIC_CDN_URL=$NEXT_PUBLIC_CDN_URL \
	NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
RUN npm run build -w apps/web
CMD ["npm", "run", "start", "-w", "apps/web"]
