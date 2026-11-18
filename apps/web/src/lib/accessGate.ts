import { listMyVendors } from './catalog-api';

export const AUTH_NEXT_COOKIE = 'auth_next';
export const AUTH_REASON_COOKIE = 'auth_reason';

type AccessReasonCopy = {
	/** Guest / no session — login redirect and guest CTAs. */
	guest: string;
	/** Signed in but still gated (usually needs a vendor org). */
	signedIn: string;
};

/**
 * Gate copy is session-aware: never show guest “Sign in…” language when a
 * session already exists (Linear/Notes-style). Use `accessReason()`.
 */
export const ACCESS_REASONS = {
	products: {
		guest:
			'Before you add or edit products, let’s get you signed in and connected to a vendor!',
		signedIn:
			'Join or create a vendor organization before you add or edit products.',
	},
	manage: {
		guest:
			'Before you manage a catalog, let’s get you signed in and connected to a vendor!',
		signedIn:
			'Join or create a vendor organization before you manage a catalog.',
	},
	vendors: {
		guest:
			'Sign in to create a vendor organization or accept an invite from an existing one.',
		signedIn:
			'Create a vendor organization or accept an invite from an existing one.',
	},
	vendorDetail: {
		guest: 'Sign in to view and manage this vendor organization.',
		signedIn: 'Join this vendor organization to view and manage it.',
	},
	import: {
		guest:
			'Before you import products, let’s get you signed in and connected to a vendor!',
		signedIn:
			'Join or create a vendor organization before you import products.',
	},
	vendorOrders: {
		guest: 'Sign in to manage vendor orders.',
		signedIn: 'Join or create a vendor organization to manage vendor orders.',
	},
	cart: {
		guest: 'Sign in to use your cart.',
		signedIn: 'Your session is ready — continue to your cart.',
	},
	checkout: {
		guest: 'Sign in to complete checkout.',
		signedIn: 'Your session is ready — continue to checkout.',
	},
	orders: {
		guest: 'Sign in to view your orders.',
		signedIn: 'Your session is ready — continue to your orders.',
	},
	uoms: {
		guest: 'Sign in to create units of measure.',
		signedIn: 'Join or create a vendor organization to create units of measure.',
	},
	attributes: {
		guest: 'Sign in to manage product attributes.',
		signedIn:
			'Join or create a vendor organization to manage product attributes.',
	},
	categories: {
		guest: 'Sign in to work with categories.',
		signedIn: 'Join or create a vendor organization to work with categories.',
	},
	invite: {
		guest: 'Sign in or create an account to accept this vendor invite.',
		signedIn: 'Accept this invite with the account that matches the invite email.',
	},
	joinDemo: {
		guest:
			'Create an account with the email you used for the demo invite, then accept membership in Demo Supply Co.',
		signedIn:
			'Open your seller workspace, or join Demo Supply Co. with this account.',
	},
	account: {
		guest: 'Sign in to manage your account.',
		signedIn: 'Continue to your account.',
	},
	notifications: {
		guest: 'Sign in to view your notifications.',
		signedIn: 'Continue to your notifications.',
	},
} as const satisfies Record<string, AccessReasonCopy>;

export type AccessReasonKey = keyof typeof ACCESS_REASONS;

/** Pick guest vs signed-in gate copy for RequireAccess and auth CTAs. */
export function accessReason(
	key: AccessReasonKey,
	signedIn: boolean,
): string {
	const copy = ACCESS_REASONS[key];
	return signedIn
		? copy.signedIn
		: copy.guest;
}

const VENDOR_REQUIRED_PREFIXES = [
	'/place-et-marque/products/new',
	'/place-et-marque/products/configure',
	'/place-et-marque/products/',
	'/place-et-marque/manage',
	'/place-et-marque/vendors/',
	'/place-et-marque/uoms',
	'/place-et-marque/attributes',
	'/place-et-marque/categories',
] as const;

/** Place et Marque web auth (App Router). API routes stay at `/auth/*`. */
export const PEM_AUTH_BASE = '/place-et-marque/auth';

export function pemAuthPath(suffix: string): string {
	const normalized = suffix.startsWith('/')
		? suffix
		: `/${suffix}`;
	return `${PEM_AUTH_BASE}${normalized}`;
}

/** Guest auth surfaces — never use these as post-login `next` (bounce fuel). */
const AUTH_GUEST_NEXT_BLOCKLIST = [
	pemAuthPath('/login'),
	pemAuthPath('/register'),
	pemAuthPath('/forgot-password'),
	pemAuthPath('/reset-password'),
	pemAuthPath('/verify'),
	pemAuthPath('/verify-email'),
	// Legacy portfolio-root auth URLs (redirect targets may still appear in next=).
	'/auth/login',
	'/auth/register',
	'/auth/forgot-password',
	'/auth/reset-password',
	'/auth/verify',
	'/auth/verify-email',
] as const;

/** Any PeM auth URL (guest + account). */
export function pathIsPemAuth(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	return pathname === PEM_AUTH_BASE || pathname.startsWith(`${PEM_AUTH_BASE}/`);
}

/**
 * Guest-only auth surfaces (login / register / OTP / password reset).
 * Account hub stays on shopping chrome; these lean the header to brand + escape.
 */
export function pathIsPemAuthGuest(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	if(!pathIsPemAuth(pathname)) {
		return false;
	}
	return !pathname.startsWith(pemAuthPath('/account'));
}

export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
	if(!raw || !raw.startsWith('/') || raw.startsWith('//')) {
		return fallback;
	}
	const pathname = raw.split('?')[0] ?? raw;
	if(
		AUTH_GUEST_NEXT_BLOCKLIST.some(
			(blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`),
		)
	) {
		return fallback;
	}
	return raw;
}

/** Seller edit/configure under /<vendorSlug>/<productSlug>/(edit|configure). */
const PRODUCT_SLUG_EDITOR_PATH =
	/^\/place-et-marque\/[^/]+\/[^/]+\/(edit|configure)$/;

/** First path segment after /place-et-marque/ that is an app route, not a vendor slug. */
const PLACE_ET_MARQUE_RESERVED_SEGMENTS = new Set([
	'attributes',
	'auth',
	'cart',
	'categories',
	'checkout',
	'guide',
	'invites',
	'join-demo',
	'manage',
	'notifications',
	'orders',
	'preferences',
	'products',
	'roadmap',
	'search',
	'uom-merges',
	'uoms',
	'vendors',
]);

/**
 * Buyer vendor storefront: /place-et-marque/<vendorSlug>.
 * Must stay on buyer chrome (cart, category bar, no Selling chip / bottom pane).
 * Distinct from seller /place-et-marque/vendors/<id>.
 */
export function pathIsBuyerVendorStorefront(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	const match = /^\/place-et-marque\/([^/]+)\/?$/.exec(pathname);
	if(!match) {
		return false;
	}
	return !PLACE_ET_MARQUE_RESERVED_SEGMENTS.has(match[1] ?? '');
}

export function pathRequiresVendor(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	if(pathname === '/place-et-marque/vendors') {
		// Vendors page is the gate itself — do not bounce back here.
		return false;
	}
	if(pathname.startsWith('/place-et-marque/invites/')) {
		return false;
	}
	if(PRODUCT_SLUG_EDITOR_PATH.test(pathname)) {
		return true;
	}
	return VENDOR_REQUIRED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(prefix),
	);
}

/**
 * Seller chrome: hide category bar + cart; show Selling chip; bottom pane = page actions.
 * Buyer storefronts (/place-et-marque/<slug>), product detail, and buyer orders
 * (/place-et-marque/orders) stay on shopping chrome — cart stays visible.
 * Seller fulfillment lives under /place-et-marque/vendors/<id>/orders.
 */
export function pathUsesSellerChrome(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	// Buyer vendor pages are never seller chrome — even for org members browsing.
	if(pathIsBuyerVendorStorefront(pathname)) {
		return false;
	}
	// Buyer purchase history is shopping chrome (not Selling).
	if(
		pathname === '/place-et-marque/orders'
		|| pathname.startsWith('/place-et-marque/orders/')
	) {
		return false;
	}
	if(
		pathname === '/place-et-marque/manage'
		|| pathname === '/place-et-marque/vendors'
		|| pathname.startsWith('/place-et-marque/vendors/')
		|| pathname === '/place-et-marque/uoms'
		|| pathname.startsWith('/place-et-marque/uoms/')
		|| pathname === '/place-et-marque/attributes'
		|| pathname.startsWith('/place-et-marque/attributes/')
		|| pathname === '/place-et-marque/categories'
		|| pathname.startsWith('/place-et-marque/categories/')
		|| pathname === '/place-et-marque/products/new'
		|| pathname === '/place-et-marque/products/configure'
	) {
		return true;
	}
	if(/^\/place-et-marque\/products\/[^/]+\/(edit|configure)$/.test(pathname)) {
		return true;
	}
	return PRODUCT_SLUG_EDITOR_PATH.test(pathname);
}

/** Vendor seller order list (`…/vendors/:id/orders`). */
export function pathIsVendorOrdersList(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	return /^\/place-et-marque\/vendors\/[^/]+\/orders\/?$/.test(pathname);
}

/**
 * Vendor order lists pin Filter/Status into the top context bar on scroll
 * (PEM-445). Reserve top host geometry before paint so empty:hidden cannot
 * late-show chrome when controls harvest up (buyer orders stay inline).
 */
export function pathReservesOrdersListTopContext(path: string): boolean {
	return pathIsVendorOrdersList(path);
}

/**
 * Manage reserves top + bottom context chrome before paint (PEM-440), like
 * the landing department bar (PEM-370/377): presence is a path decision, not
 * a post-load mount. Top host stays open (no empty:hidden pop); bottom harvest
 * pane stays mounted transparent until controls pin in. Other seller routes
 * keep empty:hidden.
 */
export function pathReservesManageContextBars(path: string): boolean {
	const pathname = path.split('?')[0] ?? path;
	return pathname === '/place-et-marque/manage';
}

/**
 * Top seller context host stays reserved before paint (manage + vendor orders).
 * Bottom pane harvest remains manage-only.
 */
export function pathReservesSellerTopContext(path: string): boolean {
	return pathReservesManageContextBars(path)
		|| pathReservesOrdersListTopContext(path);
}

/** @see pathReservesManageContextBars */
export function pathKeepsManageBottomPane(path: string): boolean {
	return pathReservesManageContextBars(path);
}

export function buildLoginUrl(options: {
	next?: string;
	reason?: string;
}): string {
	const params = new URLSearchParams();
	const next = safeNextPath(options.next ?? null);
	if(next !== '/') {
		params.set('next', next);
	}
	if(options.reason) {
		params.set('reason', options.reason);
	}
	const query = params.toString();
	const base = pemAuthPath('/login');
	return query ? `${base}?${query}` : base;
}

export function buildRegisterUrl(options: {
	next?: string;
	reason?: string;
}): string {
	const params = new URLSearchParams();
	const next = safeNextPath(options.next ?? null);
	if(next !== '/') {
		params.set('next', next);
	}
	if(options.reason) {
		params.set('reason', options.reason);
	}
	const query = params.toString();
	const base = pemAuthPath('/register');
	return query ? `${base}?${query}` : base;
}

export function buildVendorGateUrl(next?: string, reason?: string): string {
	const safe = safeNextPath(next ?? null, '/place-et-marque');
	const params = new URLSearchParams({ next: safe });
	if(reason) {
		params.set('reason', reason);
	}
	return `/place-et-marque/vendors?${params.toString()}`;
}

export function readCookie(name: string): string | null {
	if(typeof document === 'undefined') {
		return null;
	}
	const match = document.cookie
		.split('; ')
		.find((row) => row.startsWith(`${name}=`));
	if(!match) {
		return null;
	}
	return decodeURIComponent(match.slice(name.length + 1));
}

export function writeCookie(name: string, value: string, maxAgeSeconds = 60 * 30): void {
	if(typeof document === 'undefined') {
		return;
	}
	document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearCookie(name: string): void {
	if(typeof document === 'undefined') {
		return;
	}
	document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

export function stashAuthRedirect(next: string, reason?: string): void {
	writeCookie(AUTH_NEXT_COOKIE, safeNextPath(next));
	if(reason) {
		writeCookie(AUTH_REASON_COOKIE, reason);
	}
	else {
		clearCookie(AUTH_REASON_COOKIE);
	}
}

export function consumeStashedNext(fallback = '/'): string {
	const fromCookie = readCookie(AUTH_NEXT_COOKIE);
	clearCookie(AUTH_NEXT_COOKIE);
	clearCookie(AUTH_REASON_COOKIE);
	return safeNextPath(fromCookie, fallback);
}

/**
 * After login/register/verify, send the user to `next` — or to the vendor gate
 * when the destination needs a vendor membership they do not yet have.
 */
export async function resolvePostAuthDestination(nextRaw: string | null): Promise<string> {
	const next = safeNextPath(nextRaw);
	if(!pathRequiresVendor(next)) {
		return next;
	}

	try {
		const vendors = await listMyVendors();
		if(vendors.length > 0) {
			return next;
		}
	}
	catch {
		// Fall through to vendor gate when membership check fails.
	}

	return buildVendorGateUrl(next);
}
