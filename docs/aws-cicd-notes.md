# AWS and CI/CD Notes (Nest + Next + Docker)

## Current prod: single-box EC2 `t3a.large` (x86_64)

Deploy-on-box, not ECR/Fargate. Images build on the instance.

- **Instance:** `t3a.large` (2 vCPU / 8GB). OpenSearch heap stays ~1g
  (`OPENSEARCH_JAVA_OPTS` in `docker-compose.prod.yml`); leave headroom for
  Next (web + CRM) / Nest / Postgres / Redis / nginx / Go CDN.
- **Arch:** x86_64. No `platform:` / `--platform` pins in compose or Dockerfiles;
  Docker follows the host. `live.sh` refuses `DOCKER_DEFAULT_PLATFORM` only when
  it conflicts with `uname -m` (ARM optional, not the live target).
- **Build on the box.** Clone → `.env` → `./ops/deploy/live.sh` (GH Actions
  path). Manual: `./dssh publish` only if `developers-sugary-shell-helper` is
  installed on the box (`./install.sh` → `~/.local/bin`); CI does not need it.
  Do **not** copy foreign-arch `node_modules` or laptop-built images onto the host.
  `.dockerignore` already excludes `**/node_modules`.
- **DNS:** attach an **Elastic IP**; point apex + `www` + `cdn` + `crm` A
  records at it. Canonical shopper host is **www**; apex HTTP/HTTPS redirect
  there. Admin CRM is `crm.austenstrine.dev` (own Next app + nginx vhost).
  Public IP can change on stop/start without EIP.
- **TLS certs:** `live.sh` stops compose `nginx` briefly, then
  `ops/deploy/ensure-tls.sh` obtains/expands LE. Default is **HTTP-01
  standalone** for `austenstrine.dev` + `www` + `cdn` + `crm` (needs
  `CERTBOT_EMAIL` in `.env` — deploy fails if SANs are incomplete and email
  is missing). Optional wildcard: set `CERTBOT_AUTH=dns-namecheap` and put
  Namecheap API creds in `CERTBOT_DNS_CREDENTIALS` (default
  `/etc/letsencrypt/namecheap.ini`); issues `austenstrine.dev` +
  `*.austenstrine.dev`. Namecheap API needs account eligibility + EIP
  whitelist — use HTTP-01 + crm SAN unless that is already set up. Syncs
  into `TLS_CERTS_DIR` (default `/etc/nginx/certs`) via `sync-tls-certs.sh`
  and installs a certbot renew deploy hook. Nginx mounts that dir read-only;
  `live.sh` force-recreates the proxy so bind-mounted `nginx.prod.conf`
  always applies.
- **CDN:** Go binary from
  [golang-image-cdn](https://github.com/austenstrine/golang-image-cdn);
  `live.sh` runs `ops/cdn/ensure-source.sh` (shallow clone → `ops/cdn/src`)
  before `compose build cdn`. Dockerfile also clones if `src/` is empty.
  Bind-mounts `./ops/cdn/data/origin` into both `cdn` and `api` so seed stock
  downloads land where the CDN serves. No `docker cp`. After API seed,
  `live.sh` prewarms stock variants.
- **.env backup:** `ensure-env-backup.sh` resolves or shallow-clones
  `linux-gdrive-dotenv-backup-recovery` into `~/src/…`, installs restic/rclone +
  timer; one-time `push-env-backup-secrets.sh` from the laptop copies pass +
  rclone config.
- **prisma-seed-migration-sync:** npm git dep in `apps/api` (`#v0.1.0`); API
  image `npm ci` needs `git` (already in Dockerfile). No in-repo `packages/`
  copy — remove any leftover `packages/prisma-seed-migration-sync` on old
  checkouts (`git reset --hard` does not delete untracked files).
- **CI:** `.github/workflows/deploy.yml` SSHs to the box, `git reset --hard
  origin/master`, then runs `live.sh` (native x86_64 build). Ship live by
  merging `development` → `master` first; deploy always tracks `master`.
- **Live `.env` keys (CRM / cookies / CORS / TLS):** `live.sh` refuses to
  roll without these non-empty values:

  | Key | Exact live value |
  |-----|------------------|
  | `WEB_URL` | `https://www.austenstrine.dev` |
  | `CRM_URL` | `https://crm.austenstrine.dev` |
  | `COOKIE_DOMAIN` | `.austenstrine.dev` (leading dot) |
  | `CERTBOT_EMAIL` | your ACME contact email |
  | `CDN_TOKEN` | strong random (`openssl rand -hex 32`), not `local-cdn-dev` |
  | `JWT_ACCESS_SECRET` / `JWT_PENDING_SECRET` / `OTP_PEPPER` | distinct secrets |
  | `OPENSEARCH_PASSWORD` | matches compose OpenSearch admin password |

  Leave `CHECKOUT_DEV_BYPASS` unset. Optional:
  `CRM_NEXT_PUBLIC_API_BASE_URL=https://crm.austenstrine.dev/api`
  (compose default already). `WEB_URL` + `CRM_URL` feed Nest CORS and
  `CrmOriginGuard`; without them the API container exits and nginx returns 502.

Prisma engines for Alpine: `binaryTargets` in `apps/api/prisma/schema.prisma`
include `linux-musl-openssl-3.0.x` (amd64 live) plus optional
`linux-musl-arm64-openssl-3.0.x`. `prisma generate` still runs inside the api
image build.

## Recommended AWS Target (future / interview)

- Frontend: S3 + CloudFront or Amplify Hosting
- API: ECS Fargate or Lambda (Nest on Lambda via adapter)
- PostgreSQL: RDS PostgreSQL
- Redis: ElastiCache Redis
- OpenSearch: Amazon OpenSearch Service

Because you mentioned AWS nodes, ECS Fargate is typically the closest fit for long-running Node services.

## Suggested Deployment Pattern (future ECR/ECS)

1. Build and test in GitHub Actions.
2. Build Docker images for API and web (amd64 for current t3a; multi-arch or arm64 only if targeting Graviton Fargate later).
3. Push images to ECR.
4. Deploy ECS services with updated image tags.
5. Run Prisma migrations during deployment pipeline.

## GitHub Actions Enhancements to Add Next

- Add matrix job for API/web test separation.
- Add ECR login and image push.
- Add deployment job with environment protections.
- Add manual production approval gate.

## Secrets You Will Need

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- ECR_REPOSITORY_API
- ECR_REPOSITORY_WEB
- DATABASE_URL (or SSM/Secrets Manager reference)
- REDIS_URL
- OPENSEARCH_NODE

## Interview Talking Points

- Why single-box `t3a.large` first (cost + control), then ECS Fargate later
- How migrations are handled safely in CI/CD
- How health checks and rolling deploys reduce downtime
- How Redis and OpenSearch complement PostgreSQL
