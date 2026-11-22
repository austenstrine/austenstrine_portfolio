# Custodian companion coexistence (shared EC2)

How Place et Marque / portfolio deploy and the Custodian companion share one EC2
without clobbering each other. **Stability of this node is the highest
priority** (portfolio + SIP stay up). Companion live deploy itself is owned
elsewhere (Custodian GSSA-126); portfolio-impacting host contracts live **here**.

## Layout (one box)

| Path / host | Owner | Notes |
|-------------|--------|--------|
| `/var/www/html` | **Portfolio** (`TARGET_DIR`) | Compose stack: `portfolio-*`, Place et Marque, CRM, CDN |
| `/var/www/html/ops/sip` | **SIP sidecar** (portfolio tree) | Compose project `custodian-sip` → `custodian-asterisk`; **not** `docker-compose.prod.yml` |
| `/var/www/custodian` | **Companion** (sibling) | Separate checkout / www root. Prefer this over nesting under `/var/www/html` |
| `www` / `crm` / `cdn` / apex | Portfolio nginx vhosts | `ops/nginx/nginx.prod.conf` inside portfolio compose `portfolio-proxy` |
| `sip.austenstrine.dev` | SIP WSS/UDP on same node | Gray-cloud A → EC2; nginx terminates WSS → `custodian-asterisk:8088/ws` |
| `custodian.austenstrine.dev` | Companion (Cloudflare) | Same server; **must not** reuse portfolio `TARGET_DIR` |

Do **not** point portfolio `TARGET_DIR` at `/var/www` or any parent of
`/var/www/custodian`. Deploy chowns and `git reset --hard` only the portfolio
checkout.

## Portfolio Actions (must not touch companion)

Workflow: `.github/workflows/deploy.yml`

1. SSH to EC2 with `EC2_USER` / `EC2_HOST` / `SSH_PRIVATE_KEY`
2. `cd ${TARGET_DIR}` (secret; typically `/var/www/html`)
3. `git fetch` + `git reset --hard origin/master` (or clone once)
4. `./ops/deploy/live.sh`

**In scope of that job:** files under `TARGET_DIR`, portfolio compose services
(`portfolio-proxy`, `portfolio-api`, `portfolio-web`, `portfolio-crm`,
`portfolio-cdn`, postgres/redis/opensearch), TLS sync into
`TLS_CERTS_DIR`, host nginx stop/disable so compose can bind `:80`/`:443`.

**Out of scope — do not wipe, chown, reset, or compose-down:**

- `/var/www/custodian` (or any sibling under `/var/www` other than `html`)
- Companion process / its compose project / its `.env`
- `custodian-asterisk` / `ops/sip` **except** via intentional portfolio SIP
  changes that land through this repo’s normal review (SIP compose is separate
  from `live.sh`; `live.sh` does not `docker compose` that project)

Shared GitHub secrets (`EC2_HOST`, `EC2_USER`, `SSH_PRIVATE_KEY`) may be reused
by a Custodian Actions workflow. **`TARGET_DIR` must stay distinct**
(`/var/www/html` vs `/var/www/custodian`). Never share one `TARGET_DIR` between
repos.

Deploy refuses `TARGET_DIR=/var/www` (and trailing slash) so a mis-set secret
cannot `chown -R` every sibling app.

## nginx / vhost coexistence

- **One listener:** compose `portfolio-proxy` owns host `:80`/`:443`. Host
  system nginx stays stopped (`live.sh` disables it).
- **Many `server_name`s** in `ops/nginx/nginx.prod.conf`: apex, `www`, `crm`,
  `cdn`, and (on the SIP-capable branch) `sip.austenstrine.dev`.
- **Companion host:** add a dedicated `server_name custodian.austenstrine.dev`
  block (or equivalent include) that proxies to the companion upstream —
  **do not** overwrite Place et Marque / CRM / CDN / SIP blocks. Prefer landing
  that vhost change in **this** repo when it touches the shared proxy.
- **TLS:** LE leaf already covers shop + CRM (+ `sip` when that SAN is live).
  Expanding SANs briefly stops `portfolio-proxy` for HTTP-01; restore proxy
  even on failure (`live.sh` trap). Plan `custodian` SAN the same way — short
  window, never leave `:443` down.
- **SIP constraint:** sip vhost is HTTP/1.1 only (no `http2`); H2 caused `426`
  on WSS. Do not “simplify” that away when editing nginx for companion.

Cloudflare: `custodian.austenstrine.dev` may be orange-cloud; `sip.austenstrine.dev`
stays gray-cloud (UDP SIP + WSS path documented in Custodian ops notes). DNS A
for both still lands on this Elastic IP.

## Shared host vs distinct secrets

| Concern | Portfolio | Companion |
|---------|-----------|-----------|
| Checkout | `/var/www/html` | `/var/www/custodian` |
| Live env file | `/var/www/html/.env` (+ `apps/api/.env` if used) | `/var/www/custodian/.env` (preferred) |
| SIP peer secrets | `SIP_KID_SECRET` / `SIP_CUSTODIAN_SECRET` in portfolio `.env` and `ops/sip/.env` | App may *read* SIP URIs; do not copy portfolio deploy into companion root |
| Actions `TARGET_DIR` | `/var/www/html` | `/var/www/custodian` |
| Compose project | `docker-compose.yml` + `docker-compose.prod.yml` | Companion’s own (never `docker compose down` the other) |

SSH / EC2 user can be shared. Restic/rclone backup tooling on the box is shared
install; **file lists stay per-app** (see below).

## env-backup + `dssh rnano`

Portfolio glue: [`docs/tooling/env-backup.md`](../tooling/env-backup.md),
wrapper `ops/tooling/env-backup.sh` (default `ENV_BACKUP_FILES` =
`<repo>/.env` + `<repo>/apps/api/.env`).

Remote edit (from a laptop with dssh):

```bash
# Portfolio / SIP secrets (existing)
dssh rnano prod_env
# .dsshrc.local: prod_env_path=/var/www/html/.env
#                prod_env_repo=/var/www/html
```

When companion `.env` lives on the same host, add a **second** alias (do not
point `prod_env_path` at the companion file):

```bash
# Example for .dsshrc.local — real host/key stay gitignored
# custodian_env_host=ubuntu@<ec2-host>
# custodian_env_path=/var/www/custodian/.env
# custodian_env_key=~/.ssh/id_ed25519
# custodian_env_repo=/var/www/custodian
dssh rnano custodian_env
```

Backup inventory: either let the companion checkout own its
`ENV_BACKUP_FILES`, or on the host export an explicit list that includes both
`/var/www/html/.env` and `/var/www/custodian/.env` before the shared timer runs.
Never commit secrets. After SIP-related `rnano`, recreate Asterisk so templates
re-render (`cd /var/www/html/ops/sip && docker compose up -d --force-recreate`).

## Coordinator / agent checklist

Before changing deploy, nginx, TLS SANs, or host paths on this box:

1. Confirm `TARGET_DIR` is still `/var/www/html` only.
2. Confirm companion stays under `/var/www/custodian` (sibling).
3. Do not `docker stop|rm` `custodian-asterisk` or portfolio containers as a
   shortcut — use documented dssh / compose paths.
4. Prefer PRs in **this** repo for anything that edits shared proxy, LE SANs,
   or portfolio Actions.
5. Leave companion app deploy to the Custodian lane; link this doc from that
   work instead of forking host contracts only in the companion repo.

## Related

- Deploy workflow: `.github/workflows/deploy.yml`
- Live bring-up: `ops/deploy/live.sh`
- AWS / CI notes: [`docs/aws-cicd-notes.md`](../aws-cicd-notes.md)
- Env backup: [`docs/tooling/env-backup.md`](../tooling/env-backup.md)
- rnano aliases: `.dsshrc.example`
- SIP standup (Custodian Project store): `internal/gssa-28-sip-standup.md`
  (WSS, peers, security group) — not duplicated here
