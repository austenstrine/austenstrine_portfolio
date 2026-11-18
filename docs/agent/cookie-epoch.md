# Cookie epoch auto-clear (PEM-518)

Hard-coded UTC epoch for last cookie/session-breaking change. PeM middleware does one stamp≥epoch compare per load.

| Piece | Where |
|-------|--------|
| Epoch | `apps/web/src/lib/cookie-epoch.ts` → `COOKIE_EPOCH_UTC` |
| Stamp cookie | `pem_cookie_epoch` (readable; written after clear) |
| Clear | `access_token`, `refresh_token` (`/` + legacy `/api/auth`) |
| Hook | `apps/web/src/middleware.ts` (PeM matcher only) |

**Bump:** set `COOKIE_EPOCH_UTC` to ship-time UTC ISO when cookie/session contracts change (name, path, domain, SameSite, httpOnly, TTL, or anything that leaves stale browsers half-logged-in). Redeploy web. Browsers with older/missing stamps clear once, write stamp, soft-redirect if auth cookies were present.
