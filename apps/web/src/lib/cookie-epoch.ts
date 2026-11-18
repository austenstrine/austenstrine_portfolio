/**
 * PEM-518: hard-coded UTC cookie epoch.
 *
 * Bump rule: set `COOKIE_EPOCH_UTC` to ship-time UTC (ISO) whenever a
 * cookie/session-breaking change lands (name, path, domain, SameSite,
 * httpOnly, TTL contract, or anything that leaves stale browsers
 * half-logged-in). One compare per PeM load in middleware.
 */
export const COOKIE_EPOCH_UTC = '2026-11-18T03:55:45.000Z';
export const COOKIE_EPOCH_MS = Date.parse(COOKIE_EPOCH_UTC);

/** Readable stamp cookie written after a clear (middleware-readable). */
export const COOKIE_EPOCH_STAMP = 'pem_cookie_epoch';

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';

/** True when stamp parses and is ≥ epoch. Missing/invalid/older → false. */
export function stampIsCurrent(
	stampRaw: string | undefined | null,
	epochMs: number = COOKIE_EPOCH_MS,
): boolean {
	if(!stampRaw) {
		return false;
	}
	const ms = Date.parse(stampRaw);
	if(Number.isNaN(ms)) {
		return false;
	}
	return ms >= epochMs;
}
