# Austen Strine Portfolio Platform

This repository now contains a full-stack scaffold for your target stack:

- Backend: NestJS, TypeScript, PostgreSQL (Prisma), Swagger, Redis, OpenSearch
- Frontend: Next.js (React + TypeScript), Tailwind CSS v3, custom icon components
- Local infra: Docker Compose
- CI: GitHub Actions

The original static files are still in the repository root so you can migrate content incrementally.

## Monorepo Structure

- apps/api: NestJS API
- apps/web: Next.js frontend
- docs: architecture and deployment docs
- docker-compose.yml: local PostgreSQL, Redis, OpenSearch services

## Local Development

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

- CI is defined in .github/workflows/ci.yml
- Existing EC2 deployment workflow is preserved in .github/workflows/deploy.yml
- AWS deployment migration notes are in docs/aws-cicd-notes.md

## Next Step for Content Migration

1. Hero/About/Skills/Projects/Contact are now split into reusable components in apps/web/src/components/sections.
2. Projects are seeded from your legacy content in apps/api/prisma/seed.ts and rendered from /api/projects.
3. Replace placeholder profile circles with real assets by adding images under apps/web/public.
4. Add authentication/admin features only after core portfolio pages are stable.
