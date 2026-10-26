import { apiTimeoutSignal } from './timed-fetch';

export type Project = {
	id: string;
	title: string;
	slug: string;
	summary: string;
	tags: string[];
	featured: boolean;
};

function trimSlash(url: string) {
	return url.replace(/\/$/, '');
}

function publicApiBaseUrl() {
	return trimSlash(process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api');
}

function isLocalHostname(hostname: string) {
	return hostname === 'localhost'
		|| hostname === '127.0.0.1'
		|| hostname === '[::1]'
		|| hostname.startsWith('local.');
}

function internalApiBaseUrl() {
	if(process.env.API_INTERNAL_BASE_URL) {
		return trimSlash(process.env.API_INTERNAL_BASE_URL);
	}
	const publicUrl = publicApiBaseUrl();
	try {
		const url = new URL(publicUrl);
		if(url.protocol === 'https:' && isLocalHostname(url.hostname)) {
			const path = trimSlash(url.pathname) || '/api';
			return `http://127.0.0.1:4000${path}`;
		}
	}
	catch {
		return publicUrl;
	}
	return publicUrl;
}

/** Browser-facing API origin (OAuth redirects, download links, webhook docs). */
export const PUBLIC_API_BASE_URL = publicApiBaseUrl();

/**
 * Fetch origin. Next SSR cannot verify the local nginx TLS cert, so the server
 * talks to the API over HTTP on loopback. The browser still uses the public URL.
 */
export const API_BASE_URL = typeof window === 'undefined'
	? internalApiBaseUrl()
	: PUBLIC_API_BASE_URL;

export async function getProjects(): Promise<Project[]> {
	try {
		const response = await fetch(`${API_BASE_URL}/projects`, {
			cache: 'no-store',
			signal: apiTimeoutSignal(),
		});
		if(!response.ok) {
			return [];
		}
		return (await response.json()) as Project[];
	}
	catch {
		return [];
	}
}
