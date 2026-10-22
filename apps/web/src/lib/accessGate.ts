import { listMyVendors } from './catalog-api';

export const AUTH_NEXT_COOKIE = 'auth_next';
export const AUTH_REASON_COOKIE = 'auth_reason';

export const ACCESS_REASONS = {
	products:
		'Before you add or edit products, let’s get you signed in and connected to a vendor!',
	manage:
		'Before you manage a catalog, let’s get you signed in and connected to a vendor!',
	vendors:
		'Sign in to create a vendor organization or accept an invite from an existing one.',
	vendorDetail:
		'Sign in to view and manage this vendor organization.',
	import:
		'Before you import products, let’s get you signed in and connected to a vendor!',
	vendorOrders:
		'Sign in to manage vendor orders.',
	cart: 'Sign in to use your cart.',
	checkout: 'Sign in to complete checkout.',
	orders: 'Sign in to view your orders.',
	uoms: 'Sign in to create units of measure.',
	categories: 'Sign in to work with categories.',
	invite: 'Sign in or create an account to accept this vendor invite.',
	account: 'Sign in to manage your account.',
} as const;

export type AccessReasonKey = keyof typeof ACCESS_REASONS;

const VENDOR_REQUIRED_PREFIXES = [
	'/place-et-marque/products/new',
	'/place-et-marque/products/configure',
	'/place-et-marque/products/',
	'/place-et-marque/manage',
	'/place-et-marque/vendors/',
	'/place-et-marque/uoms',
] as const;

export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
	if(!raw || !raw.startsWith('/') || raw.startsWith('//')) {
		return fallback;
	}
	return raw;
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
	return VENDOR_REQUIRED_PREFIXES.some(
		(prefix) => pathname === prefix || pathname.startsWith(prefix),
	);
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
	return query ? `/auth/login?${query}` : '/auth/login';
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
	return query ? `/auth/register?${query}` : '/auth/register';
}

export function buildVendorGateUrl(next?: string): string {
	const safe = safeNextPath(next ?? null, '/place-et-marque');
	const params = new URLSearchParams({ next: safe });
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
