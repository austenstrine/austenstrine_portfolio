FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash openssl python3 make g++
COPY package*.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/prisma-seed-migration-sync/package.json ./packages/prisma-seed-migration-sync/
RUN npm ci
COPY . .
RUN npm run build -w prisma-seed-migration-sync && npm run build -w apps/api
CMD ["npm", "run", "start", "-w", "apps/api"]
