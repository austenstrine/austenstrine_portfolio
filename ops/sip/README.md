# Custodian SIP (GSSA-28 / GSSA-100)

Isolated Asterisk sidecar on the live Place et Marque box. **Not** part of `docker-compose.prod.yml`.

## Public endpoints

| Kind | Value |
|------|--------|
| SIP UDP/TCP | `sip.austenstrine.dev:5060` (optional — see WSS-only below) |
| WSS | `wss://sip.austenstrine.dev/ws` (TLS on `portfolio-proxy` → Asterisk WS `:8088`) |
| Peers | `kid`, `custodian` (secrets in `.env` / live root `.env`) |

## Security (GSSA-100)

| Control | State |
|---------|--------|
| Process user | Container `user: 1000:999` (asterisk); entrypoint refuses uid 0 |
| Capabilities | `cap_drop: [ALL]`, `no-new-privileges` |
| Anonymous SIP | No `anonymous` endpoint; `res_pjsip_endpoint_identifier_anonymous` noload; identifier order `username,auth_username` only |
| Guest / chan_sip | `noload => chan_sip.so` |
| Auth | Strong userpass on `kid` + `custodian` only (`SIP_*_SECRET` in `.env`) |
| Rate-limit | PJSIP `unidentified_request_*` (5 / 5s → 60s block) |
| Fail2ban | Optional host jail — `ops/sip/host/fail2ban/` (auth failures; dynamic kid IP OK) |
| Host ufw | Optional extra layer — **inactive by default**; never enable without allow 22/80/443 first |
| Secrets | `.env` only; entrypoint unsets secrets after render; never commit |

### WSS-only vs UDP 5060

Dialer REGISTER path is **WSS on 443** (nginx → `:8088`). UDP/TCP **5060** is only needed for softphones that cannot do WSS.

**If kid + custodian stay on WSS:** close EC2 SG **5060/tcp+udp** public. Keep **443** and **RTP UDP 10000–10100** (media still UDP even when signaling is WSS).

**Keep 5060 open** only while a UDP/TCP softphone must register.

## Bring-up (live)

```bash
# as ubuntu (docker group) — never host-root thrash
cd /var/www/html/ops/sip
# ensure .env exists (secrets); never commit
docker compose pull
docker compose up -d
docker exec custodian-asterisk id   # expect uid=1000(asterisk)
docker exec custodian-asterisk asterisk -rx 'pjsip show endpoints'
```

Optional fail2ban (host):

```bash
sudo cp ops/sip/host/fail2ban/filter.d/asterisk-custodian.conf /etc/fail2ban/filter.d/
sudo cp ops/sip/host/fail2ban/jail.d/asterisk-custodian.conf /etc/fail2ban/jail.d/
# point logpath at docker-logged messages or a bind-mounted /var/log/asterisk/messages
sudo systemctl enable --now fail2ban
sudo fail2ban-client reload
```

## Fail-closed

- Do not `docker compose` this project with portfolio files.
- Do not `docker stop|rm` `portfolio-*` for SIP work.
- Cert expand for `sip` SAN may briefly free `:80` (standalone) — see `ops/sip/expand-sip-cert.sh`.

## Dialer

Server-only for GSSA-28. Kid dialer REGISTER uses WSS (GSSA-98/99). Secrets stay out of git/logs.
