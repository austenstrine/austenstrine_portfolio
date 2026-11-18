import { NextResponse, type NextRequest } from 'next/server';

/**
 * PeM layout branches guest auth vs shop chrome (PEM-516). App Router layouts
 * do not receive the URL, so middleware forwards pathname on the request.
 */
export function middleware(request: NextRequest) {
	const headers = new Headers(request.headers);
	headers.set('x-pathname', request.nextUrl.pathname);
	return NextResponse.next({
		request: {
			headers,
		},
	});
}

export const config = {
	matcher: ['/place-et-marque', '/place-et-marque/:path*'],
};
