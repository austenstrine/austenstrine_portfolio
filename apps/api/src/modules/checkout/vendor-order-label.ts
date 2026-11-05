/**
 * Human vendor-facing order labels.
 *
 * Preferred shape (readable, not a hyphen slug):
 *   Jane Doe · 3 · Portland, OR · Nov 4, 2026, 2:32 PM PT
 *
 * Hyphenated `<user>-<count>-<city>-<state>-<datetime>` was rejected: too long to
 * say aloud, hard to scan in lists, and we have no reliable city→timezone table.
 * US state→IANA is good enough for destination-local time; non-US uses UTC.
 */

const US_STATE_TIMEZONES: Record<string, string> = {
	AL: 'America/Chicago',
	AK: 'America/Anchorage',
	AZ: 'America/Phoenix',
	AR: 'America/Chicago',
	CA: 'America/Los_Angeles',
	CO: 'America/Denver',
	CT: 'America/New_York',
	DC: 'America/New_York',
	DE: 'America/New_York',
	FL: 'America/New_York',
	GA: 'America/New_York',
	HI: 'Pacific/Honolulu',
	IA: 'America/Chicago',
	ID: 'America/Boise',
	IL: 'America/Chicago',
	IN: 'America/Indiana/Indianapolis',
	KS: 'America/Chicago',
	KY: 'America/New_York',
	LA: 'America/Chicago',
	MA: 'America/New_York',
	MD: 'America/New_York',
	ME: 'America/New_York',
	MI: 'America/Detroit',
	MN: 'America/Chicago',
	MO: 'America/Chicago',
	MS: 'America/Chicago',
	MT: 'America/Denver',
	NC: 'America/New_York',
	ND: 'America/Chicago',
	NE: 'America/Chicago',
	NH: 'America/New_York',
	NJ: 'America/New_York',
	NM: 'America/Denver',
	NV: 'America/Los_Angeles',
	NY: 'America/New_York',
	OH: 'America/New_York',
	OK: 'America/Chicago',
	OR: 'America/Los_Angeles',
	PA: 'America/New_York',
	RI: 'America/New_York',
	SC: 'America/New_York',
	SD: 'America/Chicago',
	TN: 'America/Chicago',
	TX: 'America/Chicago',
	UT: 'America/Denver',
	VA: 'America/New_York',
	VT: 'America/New_York',
	WA: 'America/Los_Angeles',
	WI: 'America/Chicago',
	WV: 'America/New_York',
	WY: 'America/Denver',
};

export type VendorOrderLabelInput = {
	shipName?: string | null;
	buyerEmail?: string | null;
	itemCount: number;
	shipCity?: string | null;
	shipRegion?: string | null;
	shipCountry?: string | null;
	at: Date;
};

export function resolveBuyerLabelPart(
	shipName?: string | null,
	buyerEmail?: string | null,
): string {
	const fromShip = collapseWhitespace(shipName ?? '');
	if(fromShip) {
		return fromShip;
	}
	const local = (buyerEmail ?? '').split('@')[0]?.trim() ?? '';
	if(local) {
		return local;
	}
	return 'Buyer';
}

export function resolveDestinationTimezone(
	shipRegion?: string | null,
	shipCountry?: string | null,
): string {
	const country = (shipCountry ?? 'US').trim().toUpperCase();
	if(country === 'US' || country === 'USA' || country === 'UNITED STATES') {
		const region = (shipRegion ?? '').trim().toUpperCase();
		if(US_STATE_TIMEZONES[region]) {
			return US_STATE_TIMEZONES[region];
		}
		return 'America/New_York';
	}
	return 'UTC';
}

export function formatOrderLabelWhen(
	at: Date,
	timeZone: string,
): string {
	return new Intl.DateTimeFormat('en-US', {
		timeZone,
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short',
	}).format(at);
}

export function formatItemCountPart(itemCount: number): string {
	const n = Number.isFinite(itemCount)
		? Math.max(0, Math.round(itemCount))
		: 0;
	return String(n);
}

export function formatPlacePart(
	shipCity?: string | null,
	shipRegion?: string | null,
): string {
	const city = collapseWhitespace(shipCity ?? '');
	const region = collapseWhitespace(shipRegion ?? '').toUpperCase();
	if(city && region) {
		return `${city}, ${region}`;
	}
	return city || region || 'Unknown place';
}

/** Build the base human label (no collision suffix). */
export function buildVendorOrderLabel(input: VendorOrderLabelInput): string {
	const who = resolveBuyerLabelPart(input.shipName, input.buyerEmail);
	const count = formatItemCountPart(input.itemCount);
	const place = formatPlacePart(input.shipCity, input.shipRegion);
	const tz = resolveDestinationTimezone(input.shipRegion, input.shipCountry);
	const when = formatOrderLabelWhen(input.at, tz);
	return `${who} · ${count} · ${place} · ${when}`;
}

export function withOrderLabelSuffix(base: string, attempt: number): string {
	if(attempt <= 1) {
		return base;
	}
	return `${base} · ${attempt}`;
}

function collapseWhitespace(value: string): string {
	return value.replace(/\s+/g, ' ').trim();
}
