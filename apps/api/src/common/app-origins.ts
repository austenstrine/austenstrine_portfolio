/** Normalize an origin URL (scheme + host[+port], no trailing slash). */
export function normalizeOrigin(raw: string | undefined | null): string | null {
	const trimmed = raw?.trim();
	if(!trimmed) {
		return null;
	}
	try {
		const url = new URL(trimmed);
		return `${url.protocol}//${url.host}`;
	}
	catch {
		return null;
	}
}

export function webOrigin(): string | null {
	return normalizeOrigin(process.env.WEB_URL);
}

export function crmOrigin(): string | null {
	return normalizeOrigin(process.env.CRM_URL);
}

/** Origins allowed for browser CORS (web + CRM). */
export function corsAllowedOrigins(): string[] {
	const origins = new Set<string>();
	const web = webOrigin();
	const crm = crmOrigin();
	if(web) {
		origins.add(web);
	}
	if(crm) {
		origins.add(crm);
	}
	// HTTP localhost Next (direct :3000 / :3001) must reach the API without
	// going through local HTTPS — Chromium fails that path from an HTTP page.
	if(process.env.NODE_ENV !== 'production') {
		origins.add('http://localhost:3000');
		origins.add('http://127.0.0.1:3000');
		origins.add('http://[::1]:3000');
		origins.add('http://localhost:3001');
		origins.add('http://127.0.0.1:3001');
		origins.add('http://[::1]:3001');
	}
	if(origins.size === 0) {
		origins.add('http://localhost:3000');
	}
	return [...origins];
}

/**
 * Best-effort browser origin for a request. Prefers Origin, then Referer.
 * Returns null when neither is a usable absolute URL.
 */
export function requestBrowserOrigin(headers: {
	origin?: string | string[];
	referer?: string | string[];
}): string | null {
	const originHeader = Array.isArray(headers.origin)
		? headers.origin[0]
		: headers.origin;
	const fromOrigin = normalizeOrigin(originHeader);
	if(fromOrigin) {
		return fromOrigin;
	}

	const refererHeader = Array.isArray(headers.referer)
		? headers.referer[0]
		: headers.referer;
	if(!refererHeader?.trim()) {
		return null;
	}
	try {
		const url = new URL(refererHeader.trim());
		return `${url.protocol}//${url.host}`;
	}
	catch {
		return null;
	}
}

export function isCrmBrowserOrigin(headers: {
	origin?: string | string[];
	referer?: string | string[];
}): boolean {
	const crm = crmOrigin();
	if(!crm) {
		return false;
	}
	const browser = requestBrowserOrigin(headers);
	return browser === crm;
}

export function isWebBrowserOrigin(headers: {
	origin?: string | string[];
	referer?: string | string[];
}): boolean {
	const web = webOrigin();
	if(!web) {
		return false;
	}
	const browser = requestBrowserOrigin(headers);
	return browser === web;
}
