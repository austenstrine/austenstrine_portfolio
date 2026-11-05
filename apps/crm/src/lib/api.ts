import { apiTimeoutSignal } from './timed-fetch';

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
		|| hostname.startsWith('local.')
		|| hostname.includes('.local.');
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

export const PUBLIC_API_BASE_URL = publicApiBaseUrl();

export const API_BASE_URL = typeof window === 'undefined'
	? internalApiBaseUrl()
	: PUBLIC_API_BASE_URL;

export { apiTimeoutSignal };
