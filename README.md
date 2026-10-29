# austenstrine.dev

Public site for Austen Strine: homepage and CV. Next.js builds the pages. NestJS serves `/api/health`. There is no login, catalog, or marketplace on this branch.

## Apps

- `apps/web`: Next.js homepage, experience, about, skills, contact, and `/cv.html`
- `apps/api`: NestJS `/api/health` (no database)

## Local

```bash
npm ci
npm run dev:api
npm run dev:web
```

- Web: http://localhost:3000
- API health: http://localhost:4000/api/health
- API docs: http://localhost:4000/api/docs

`npm run build` writes a static export to `apps/web/out`. Production deploy copies that export into the nginx document root so the current EC2 `git pull` host keeps serving files.

## Live

`ops/deploy/live.sh` (run after `git pull` on master) does `npm ci`, builds Nest + Next, copies the Next export to the repo root and `www/`, and starts Nest on port 4000. Optional reverse-proxy notes are in `ops/nginx/austenstrine.dev.conf`.
