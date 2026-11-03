# Place et Marque — CDN glue

The Go image CDN binary no longer lives in this tree. It is
**[austenstrine/golang-image-cdn](https://github.com/austenstrine/golang-image-cdn)**
(public). This directory keeps PeM-only glue:

| Path | Role |
| --- | --- |
| `ensure-source.sh` | Clone/update `golang-image-cdn` into `src/` (gitignored) |
| `Dockerfile` | Build from `src/` + layer PeM `prewarm.sh` |
| `prewarm.sh` | Warm catalog stock variants after live seed |
| `init-local.sh` | Ensure source + local hostname tip |
| `purge.sh` | Purge helper that reads monorepo `.env` |
| `data/origin`, `data/cache` | Bind-mount volumes (shared origin with API) |

## Why clone-in-deploy (not a submodule)

Live and local Compose both `build: context: ./ops/cdn`. A **git submodule**
would require every clone/`git pull` on the EC2 box to remember
`--recurse-submodules`, which has bitten this stack before. Instead
`ensure-source.sh` fetches a shallow clone into `ops/cdn/src` right before
image build:

- `ops/deploy/live.sh` calls it before `compose build … cdn`
- `ops/cdn/init-local.sh` (dssh `cdn_start_local`) calls it for laptop runs

Pin a ref with `CDN_SOURCE_REF` (default `master`) or override the URL with
`CDN_SOURCE_REPO`. Offline boxes need one successful clone (or a mirrored
`src/`) before build.

## Quick local

```bash
./ops/cdn/ensure-source.sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml build cdn
```

See the [golang-image-cdn README](https://github.com/austenstrine/golang-image-cdn)
for env vars, transform query params, and nginx sketches.
