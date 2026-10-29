FROM node:20-alpine
WORKDIR /app
COPY ops/docker/ensure-npm.sh /usr/local/bin/ensure-npm.sh
RUN chmod +x /usr/local/bin/ensure-npm.sh && ensure-npm.sh
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
RUN npm ci
COPY . .
RUN npm run build -w apps/web
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "apps/web"]
