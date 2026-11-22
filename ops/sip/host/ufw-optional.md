# Optional host ufw (GSSA-100)

**Default on live: ufw inactive.** EC2 security group is the primary edge.

Only enable ufw if you want a second layer. Wrong default-deny without SSH allow = lockout.

## Safe allow list (never remove)

| Proto | Port | Why |
|-------|------|-----|
| TCP | 22 | SSH |
| TCP | 80 | HTTP / ACME |
| TCP | 443 | HTTPS + **WSS REGISTER** |

## Asterisk (only if needed)

| Proto | Port | When |
|-------|------|------|
| UDP+TCP | 5060 | Softphone UDP/TCP only — **skip if WSS-only** |
| UDP | 10000:10100 | RTP media (still needed with WSS signaling) |

## Sketch (do not paste-run blindly)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
# WSS-only path — omit 5060:
# sudo ufw allow 5060/udp
# sudo ufw allow 5060/tcp
sudo ufw allow 10000:10100/udp
sudo ufw --force enable
sudo ufw status verbose
```

Never block docker-published portfolio ports that map through 80/443. Do not open management ports.
