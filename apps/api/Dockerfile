FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash
COPY ops/docker/ensure-npm.sh /usr/local/bin/ensure-npm.sh
RUN chmod +x /usr/local/bin/ensure-npm.sh && ensure-npm.sh
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm ci
COPY . .
RUN npm run build -w apps/api
EXPOSE 4000
CMD ["npm", "run", "start", "-w", "apps/api"]
