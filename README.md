# Austen Strine Portfolio Platform

Full-stack portfolio + Place et Marque marketplace demo:

- Backend: NestJS, TypeScript, PostgreSQL (Prisma), Swagger, Redis, OpenSearch
- Frontend: Next.js (React + TypeScript), Tailwind CSS v3, custom icon components
- Local infra: Docker Compose via `./dssh` ([developers-sugary-shell-helper](https://github.com/austenstrine/developers-sugary-shell-helper); project map in `.dsshrc`)
- CI/CD: GitHub Actions → EC2 (`t3a.large`) via `ops/deploy/live.sh`

## Git branches

- Integrate on **`development`** (based on `master`). Do not develop on `master`.
- Feature branches: `feature/<user>/development/<feature-name>` (user usually `als`).
- Merge features into `development` directly (no PR). Rebase/pull onto `development` when peers land.
- `development` → `master` only when asked (then fast-forward `development` to that tip).

## Monorepo Structure

- apps/api: NestJS API
- apps/web: Next.js frontend
- docs: architecture and deployment docs
- docker-compose.yml: local PostgreSQL, Redis, OpenSearch services

## Third-party tools (install separately)

Helpers are not vendored. Install/clone them, then use the thin portfolio wrappers.

| Tool | Repo | Portfolio entry |
|------|------|-----------------|
| `dssh` / `rlog` | [developers-sugary-shell-helper](https://github.com/austenstrine/developers-sugary-shell-helper) | `./dssh` (`.dsshrc` stays here) |
| env-backup | [linux-gdrive-dotenv-backup-recovery](https://github.com/austenstrine/linux-gdrive-dotenv-backup-recovery) | `ops/tooling/env-backup.sh` — see `docs/tooling/env-backup.md` |
| prisma-seed-migration-sync | [prisma-seed-migration-sync](https://github.com/austenstrine/prisma-seed-migration-sync) | npm git dep in `apps/api` (`#v0.1.0`) |
| golang-image-cdn | [golang-image-cdn](https://github.com/austenstrine/golang-image-cdn) | `ops/cdn/ensure-source.sh` clones into `ops/cdn/src` |
| prisma-type-sync-generator | [prisma-type-sync-generator](https://github.com/austenstrine/prisma-type-sync-generator) | optional / not wired into Nest yet |

## Local Development

0. Install `dssh` (once per machine):
	- `git clone https://github.com/austenstrine/developers-sugary-shell-helper.git && cd developers-sugary-shell-helper && ./install.sh`
	- Put `~/.local/bin` on `PATH` (`export PATH="$HOME/.local/bin:$PATH"`), **or** clone as a sibling of this repo (`../developers-sugary-shell-helper`), **or** set `DSSH_BIN` to that repo’s `bin/dssh`.
	- Portfolio `./dssh` is a thin wrapper; config stays in `.dsshrc`. If the CLI is missing, `./dssh` exits 127 with install steps.
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
	- Or containers: `./dssh backend start`
7. Start frontend:
	- npm run dev:web

## Useful Endpoints

- API health: http://localhost:4000/api/health
- API projects: http://localhost:4000/api/projects
- Swagger docs: http://localhost:4000/api/docs
- Web app: http://localhost:3000

## CI/CD

- CI: `.github/workflows/ci.yml` (lint/test/build; runs `prepare:api-types` first)
- Deploy: `.github/workflows/deploy.yml` SSHs to EC2, `git reset --hard origin/master`, `./ops/deploy/live.sh` (no `dssh` on the box for CI). Merge `development` → `master` before expecting live to pick up integration work.
- Live third-party: CDN + env-backup tools are clone-in-deploy (`ensure-source.sh` / `ensure-env-backup.sh`). Seed-sync is the API image git dep.
- Notes: `docs/aws-cicd-notes.md`
