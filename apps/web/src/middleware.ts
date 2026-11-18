import { NextResponse, type NextRequest } from 'next/server';
import {
	ACCESS_TOKEN_COOKIE,
	COOKIE_EPOCH_STAMP,
	REFRESH_TOKEN_COOKIE,
	stampIsCurrent,
} from './lib/cookie-epoch';

/**
 * PeM layout branches guest auth vs shop chrome (PEM-516). App Router layouts
 * do not receive the URL, so middleware forwards pathname on the request.
 *
 * PEM-518: one stamp≥epoch compare. Missing/older → clear auth cookies, write
 * stamp, soft-redirect once when auth cookies were present so SSR matches.
 */
function withPathname(request: NextRequest): NextResponse {
	const headers = new Headers(request.headers);
	headers.set('x-pathname', request.nextUrl.pathname);
	return NextResponse.next({
		request: {
			headers,
		},
	});
}

function cookieDomain(): string | undefined {
	const raw = process.env.COOKIE_DOMAIN?.trim();
	return raw
		? raw
		: undefined;
}

function authClearOptions(path: string) {
	const domain = cookieDomain();
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV !== 'development',
		sameSite: 'lax' as const,
		path,
		maxAge: 0,
		...(domain
			? { domain }
			: {}),
	};
}

function stampOptions() {
	const domain = cookieDomain();
	return {
		httpOnly: false,
		secure: process.env.NODE_ENV !== 'development',
		sameSite: 'lax' as const,
		path: '/',
		maxAge: 60 * 60 * 24 * 400,
		...(domain
			? { domain }
			: {}),
	};
}

function clearAuthCookies(res: NextResponse): void {
	res.cookies.set(ACCESS_TOKEN_COOKIE, '', authClearOptions('/'));
	res.cookies.set(REFRESH_TOKEN_COOKIE, '', authClearOptions('/'));
	// Legacy path-scoped refresh from older sessions (auth.controller).
	res.cookies.set(REFRESH_TOKEN_COOKIE, '', authClearOptions('/api/auth'));
}

export function middleware(request: NextRequest) {
	const stamp = request.cookies.get(COOKIE_EPOCH_STAMP)?.value;
	if(stampIsCurrent(stamp)) {
		return withPathname(request);
	}

	const hadAuth = Boolean(
		request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
		|| request.cookies.get(REFRESH_TOKEN_COOKIE)?.value,
	);
	const newStamp = new Date().toISOString();

	if(hadAuth) {
		const redirect = NextResponse.redirect(request.nextUrl);
		clearAuthCookies(redirect);
		redirect.cookies.set(COOKIE_EPOCH_STAMP, newStamp, stampOptions());
		return redirect;
	}

	const res = withPathname(request);
	clearAuthCookies(res);
	res.cookies.set(COOKIE_EPOCH_STAMP, newStamp, stampOptions());
	return res;
}

export const config = {
	matcher: ['/place-et-marque', '/place-et-marque/:path*'],
};
