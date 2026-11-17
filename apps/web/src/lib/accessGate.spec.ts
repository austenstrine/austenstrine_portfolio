import {
	accessReason,
	buildLoginUrl,
	pathIsBuyerVendorStorefront,
	pathRequiresVendor,
	pathUsesSellerChrome,
	safeNextPath,
} from './accessGate';

describe('accessGate path and session contracts', () => {
	it('picks session-aware gate copy (never guest Sign in when signed in)', () => {
		expect(accessReason('manage', false)).toMatch(/signed in/i);
		expect(accessReason('manage', true)).not.toMatch(/sign in/i);
		expect(accessReason('cart', true)).toMatch(/session is ready/i);
	});

	it('requires vendor membership for seller manage/create paths', () => {
		expect(pathRequiresVendor('/place-et-marque/manage')).toBe(true);
		expect(pathRequiresVendor('/place-et-marque/products/new')).toBe(true);
		expect(pathRequiresVendor('/place-et-marque/demo/widget/edit')).toBe(true);
		expect(pathRequiresVendor('/place-et-marque/vendors')).toBe(false);
		expect(pathRequiresVendor('/place-et-marque/cart')).toBe(false);
		expect(pathRequiresVendor('/place-et-marque/search')).toBe(false);
	});

	it('keeps buyer storefronts and buyer orders on shopping chrome', () => {
		expect(pathIsBuyerVendorStorefront('/place-et-marque/demo-supply')).toBe(true);
		expect(pathIsBuyerVendorStorefront('/place-et-marque/manage')).toBe(false);
		expect(pathUsesSellerChrome('/place-et-marque/demo-supply')).toBe(false);
		expect(pathUsesSellerChrome('/place-et-marque/orders')).toBe(false);
		expect(pathUsesSellerChrome('/place-et-marque/manage')).toBe(true);
		expect(pathUsesSellerChrome('/place-et-marque/vendors/v1/orders')).toBe(true);
	});

	it('sanitizes next paths and builds login URLs', () => {
		expect(safeNextPath('https://evil.example')).toBe('/');
		expect(safeNextPath('//evil.example')).toBe('/');
		expect(safeNextPath('/place-et-marque/cart')).toBe('/place-et-marque/cart');
		expect(buildLoginUrl({ next: '/place-et-marque/cart', reason: 'cart' })).toBe(
			'/auth/login?next=%2Fplace-et-marque%2Fcart&reason=cart',
		);
	});
});
