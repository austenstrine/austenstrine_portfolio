import {
	findLinkNameConflict,
	isTooSimilarLinkName,
	normalizeLinkName,
} from './vendor-link-name';

describe('vendor-link-name', () => {
	it('normalizes punctuation into hyphens', () => {
		expect(normalizeLinkName(' Demo Supply Co. ')).toBe('demo-supply-co');
	});

	it('treats hyphen variants as the same', () => {
		expect(isTooSimilarLinkName('demo-supply', 'demosupply')).toBe(true);
		expect(findLinkNameConflict('demo-supply', ['demosupply'])).toBe('too_similar');
	});

	it('flags near-prefix lookalikes', () => {
		expect(isTooSimilarLinkName('demo-supply', 'demo-supply-co')).toBe(true);
		expect(findLinkNameConflict('acme', ['acme1'])).toBe('too_similar');
	});

	it('allows clearly distinct names', () => {
		expect(isTooSimilarLinkName('demo-supply', 'northwind-tools')).toBe(false);
		expect(findLinkNameConflict('northwind-tools', ['demo-supply'])).toBeNull();
	});

	it('reports exact taken separately', () => {
		expect(findLinkNameConflict('demo-supply', ['demo-supply'])).toBe('taken');
	});

	it('can exclude the vendor’s current name', () => {
		expect(
			findLinkNameConflict('demo-supply', ['demo-supply'], {
				excludeSlug: 'demo-supply',
			}),
		).toBeNull();
	});
});
