import {
	COOKIE_EPOCH_MS,
	COOKIE_EPOCH_UTC,
	stampIsCurrent,
} from './cookie-epoch';

describe('cookie-epoch stamp compare', () => {
	it('exposes a parseable UTC epoch', () => {
		expect(Number.isNaN(COOKIE_EPOCH_MS)).toBe(false);
		expect(Date.parse(COOKIE_EPOCH_UTC)).toBe(COOKIE_EPOCH_MS);
	});

	it('treats missing or invalid stamp as stale', () => {
		expect(stampIsCurrent(undefined)).toBe(false);
		expect(stampIsCurrent(null)).toBe(false);
		expect(stampIsCurrent('')).toBe(false);
		expect(stampIsCurrent('not-a-date')).toBe(false);
	});

	it('accepts stamp ≥ epoch and rejects older', () => {
		expect(stampIsCurrent(COOKIE_EPOCH_UTC)).toBe(true);
		expect(stampIsCurrent(new Date(COOKIE_EPOCH_MS + 1).toISOString())).toBe(true);
		expect(stampIsCurrent(new Date(COOKIE_EPOCH_MS - 1).toISOString())).toBe(false);
	});
});
