# Custodian SIP (GSSA-28)

Isolated Asterisk sidecar on the live Place et Marque box. **Not** part of `docker-compose.prod.yml`.

## Public endpoints

| Kind | Value |
|------|--------|
| SIP UDP/TCP | `sip.austenstrine.dev:5060` |
| WSS | `wss://sip.austenstrine.dev/ws` (TLS on `portfolio-proxy` → Asterisk WS `:8088`) |
| Peers | `kid`, `custodian` (secrets in `.env` / live root `.env`) |

## Bring-up (live)

```bash
cd /var/www/html/ops/sip
# ensure .env exists (secrets); never commit
docker compose pull
docker compose up -d
docker exec custodian-asterisk asterisk -rx 'pjsip show endpoints'
```

## Fail-closed

- Do not `docker compose` this project with portfolio files.
- Do not `docker stop|rm` `portfolio-*` for SIP work.
- Cert expand for `sip` SAN may briefly free `:80` (standalone) — see `ops/sip/expand-sip-cert.sh`.

## Dialer

Server-only. Custodian `VoipSessionClient` / kid VoIP chrome **HOLD** until GSSA-96 PCM tip.
