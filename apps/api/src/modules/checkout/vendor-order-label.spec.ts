import {
	buildVendorOrderLabel,
	formatItemCountPart,
	formatPlacePart,
	resolveBuyerLabelPart,
	resolveDestinationTimezone,
	withOrderLabelSuffix,
} from './vendor-order-label';

describe('vendor-order-label', () => {
	it('prefers ship name, then email local-part', () => {
		expect(resolveBuyerLabelPart(' Jane  Doe ', 'x@y.com')).toBe('Jane Doe');
		expect(resolveBuyerLabelPart('', 'buyer@example.com')).toBe('buyer');
		expect(resolveBuyerLabelPart(null, null)).toBe('Buyer');
	});

	it('maps US states to destination timezones', () => {
		expect(resolveDestinationTimezone('OR', 'US')).toBe('America/Los_Angeles');
		expect(resolveDestinationTimezone('ny', 'usa')).toBe('America/New_York');
		expect(resolveDestinationTimezone('ON', 'CA')).toBe('UTC');
	});

	it('formats place and item count', () => {
		expect(formatPlacePart('Portland', 'or')).toBe('Portland, OR');
		expect(formatPlacePart('', 'OR')).toBe('OR');
		expect(formatItemCountPart(3.2)).toBe('3');
		expect(formatItemCountPart(-1)).toBe('0');
	});

	it('builds a readable label with destination-local time', () => {
		const label = buildVendorOrderLabel({
			shipName: 'Jane Doe',
			itemCount: 3,
			shipCity: 'Portland',
			shipRegion: 'OR',
			shipCountry: 'US',
			at: new Date('2026-11-04T22:32:00.000Z'),
		});
		expect(label.startsWith('Jane Doe · 3 · Portland, OR · ')).toBe(true);
		expect(label).toMatch(/PT|PST|PDT/);
		expect(label.includes('ord_')).toBe(false);
	});

	it('adds collision suffixes', () => {
		expect(withOrderLabelSuffix('base', 1)).toBe('base');
		expect(withOrderLabelSuffix('base', 2)).toBe('base · 2');
	});
});
