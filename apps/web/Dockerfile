FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash
COPY package*.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/prisma-seed-migration-sync/package.json ./packages/prisma-seed-migration-sync/
RUN npm ci
COPY . .
RUN npm run build -w apps/web
CMD ["npm", "run", "start", "-w", "apps/web"]
