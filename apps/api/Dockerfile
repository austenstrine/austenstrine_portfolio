FROM node:20-alpine
WORKDIR /app
# git: temporary until prisma-seed-migration-sync is on npm (TODO: drop git + switch dep to ^0.1.0).
RUN apk add --no-cache bash openssl python3 make g++ git
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
