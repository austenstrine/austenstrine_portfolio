# AWS and CI/CD Notes (Nest + Next + Docker)

## Current prod: single-box EC2 `t3a.large` (x86_64)

Deploy-on-box, not ECR/Fargate. Images build on the instance.

- **Instance:** `t3a.large` (2 vCPU / 8GB). OpenSearch heap stays ~1g
  (`OPENSEARCH_JAVA_OPTS` in `docker-compose.prod.yml`); leave headroom for
  Next / Nest / Postgres / Redis / nginx / Go CDN.
- **Arch:** x86_64. No `platform:` / `--platform` pins in compose or Dockerfiles;
  Docker follows the host. `live.sh` refuses `DOCKER_DEFAULT_PLATFORM` only when
  it conflicts with `uname -m` (ARM optional, not the live target).
- **Build on the box.** Clone → `.env` → `./dssh publish` (or `./ops/deploy/live.sh`).
  Do **not** copy foreign-arch `node_modules` or laptop-built images onto the host.
  `.dockerignore` already excludes `**/node_modules`.
- **DNS:** attach an **Elastic IP**; point apex + `www` + `cdn` A records at it.
  Canonical site host is **www**; apex HTTP/HTTPS redirect there. Public IP can
  change on stop/start without EIP.
- **TLS certs:** `live.sh` → `ops/deploy/ensure-tls.sh` obtains/expands LE for
  `austenstrine.dev` + `www` + `cdn` (needs `CERTBOT_EMAIL`), copies into
  `TLS_CERTS_DIR` (default `/etc/nginx/certs`) via `sync-tls-certs.sh`, and
  installs a certbot renew deploy hook. Nginx mounts that dir read-only.
- **CDN:** Go binary from
  [golang-image-cdn](https://github.com/austenstrine/golang-image-cdn);
  `live.sh` runs `ops/cdn/ensure-source.sh` (shallow clone → `ops/cdn/src`)
  before `compose build cdn`. Bind-mounts `./ops/cdn/data/origin` into both
  `cdn` and `api` so seed stock downloads land where the CDN serves. No
  `docker cp`. After API seed, `live.sh` prewarms stock variants.
- **.env backup:** `ensure-env-backup.sh` installs restic/rclone + timer; one-time
  `push-env-backup-secrets.sh` from the laptop copies pass + rclone config.
- **CI:** `.github/workflows/deploy.yml` SSHs to the box, `git reset`, then
  runs `live.sh` there (native x86_64 build). No buildx / multi-arch push needed.

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
