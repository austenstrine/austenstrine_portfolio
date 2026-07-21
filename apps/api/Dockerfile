FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
RUN npm ci
COPY . .
RUN npm run build -w apps/api
CMD ["npm", "run", "start", "-w", "apps/api"]
