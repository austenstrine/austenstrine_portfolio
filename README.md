# austenstrine.dev

Public site for Austen Strine: homepage and CV, running on Next.js with a NestJS health API.

There is no login, catalog, or marketplace on this branch.

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

Or `docker compose up --build`.

## Live

`ops/deploy/live.sh` builds and starts Nest + Next. Production nginx should reverse-proxy `/` to port 3000 and `/api/` to port 4000; see `ops/nginx/austenstrine.dev.conf`.
