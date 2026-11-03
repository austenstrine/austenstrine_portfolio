# Austen Strine Portfolio Platform

Full-stack portfolio + Place et Marque marketplace demo:

- Backend: NestJS, TypeScript, PostgreSQL (Prisma), Swagger, Redis, OpenSearch
- Frontend: Next.js (React + TypeScript), Tailwind CSS v3, custom icon components
- Local infra: Docker Compose via `./dssh` ([developers-sugary-shell-helper](https://github.com/austenstrine/developers-sugary-shell-helper); project map in `.dsshrc`)
- CI/CD: GitHub Actions → EC2 (`t3a.large`) via `ops/deploy/live.sh`

## Monorepo Structure

- apps/api: NestJS API
- apps/web: Next.js frontend
- docs: architecture and deployment docs
- docker-compose.yml: local PostgreSQL, Redis, OpenSearch services

## Local Development

0. Install `dssh` (once per machine):
	- `git clone https://github.com/austenstrine/developers-sugary-shell-helper.git && cd developers-sugary-shell-helper && ./install.sh`
	- Or set `DSSH_BIN` to that repo’s `bin/dssh`. Portfolio `./dssh` is a thin wrapper; config stays in `.dsshrc`.
1. Copy environment file:
	- Windows (PowerShell): Copy-Item .env.example .env
2. Install dependencies:
	- npm ci
3. Start local data services:
	- docker compose up -d
4. Generate Prisma client and run migrations:
	- npm run prisma:generate -w apps/api
	- npm run prisma:migrate -w apps/api
5. Seed migrated projects content:
	- npm run prisma:seed -w apps/api
6. Start API:
	- npm run dev:api
7. Start frontend:
	- npm run dev:web

## Useful Endpoints

- API health: http://localhost:4000/api/health
- API projects: http://localhost:4000/api/projects
- Swagger docs: http://localhost:4000/api/docs
- Web app: http://localhost:3000

## CI/CD

- CI: `.github/workflows/ci.yml` (lint/test/build; runs `prepare:api-types` first)
- Deploy: `.github/workflows/deploy.yml` SSHs to EC2, `git reset --hard origin/master`, `./ops/deploy/live.sh`
- Notes: `docs/aws-cicd-notes.md`
