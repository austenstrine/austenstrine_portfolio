FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash
COPY ops/docker/ensure-npm.sh /usr/local/bin/ensure-npm.sh
RUN chmod +x /usr/local/bin/ensure-npm.sh && ensure-npm.sh
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY . .
CMD ["npm", "run", "dev", "-w", "apps/web"]
