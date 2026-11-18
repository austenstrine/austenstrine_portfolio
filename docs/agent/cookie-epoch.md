# Cookie epoch auto-clear (PEM-518 / PEM-519)

Hard-coded UTC epoch for the last cookie/session-breaking change. PeM middleware does one stamp≥epoch compare per load.

| Piece | Where |
|-------|--------|
| Epoch constant | `COOKIE_EPOCH_UTC` in `apps/web/src/lib/cookie-epoch.ts` |
| Stamp cookie | `pem_cookie_epoch` (readable; written after clear) |
| Clear | `access_token`, `refresh_token` (`/` + legacy `/api/auth`) |
| Hook | `apps/web/src/middleware.ts` (PeM matcher only) |

**When to bump:** any cookie/session change that can leave bad local cookies (name, path, domain, SameSite, httpOnly, TTL, or half-logged-in browsers). Set `COOKIE_EPOCH_UTC` to **ship-time UTC** ISO in `apps/web/src/lib/cookie-epoch.ts`. Redeploy web. Browsers with older/missing stamps clear once, write `pem_cookie_epoch`, soft-redirect if auth cookies were present.
