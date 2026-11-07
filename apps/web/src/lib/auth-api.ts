import { API_BASE_URL, PUBLIC_API_BASE_URL } from './api';
import { apiTimeoutSignal } from './timed-fetch';

export type AuthUser = {
	id: string;
	email: string;
	hasPassword: boolean;
};

export type RegisterResponse = {
	message: string;
};

export type PendingLoginResponse = {
	pendingToken: string;
	expiresInSeconds: number;
};

export type SessionResponse = {
	user: AuthUser;
	accessTokenExpiresInSeconds: number;
};

export class AuthApiError extends Error {
	readonly status: number;

	constructor(message: string, status: number) {
		super(message);
		this.status = status;
	}
}

let refreshInFlight: Promise<boolean> | null = null;

async function parseJson(response: Response): Promise<unknown> {
	const contentType = response.headers.get('content-type') ?? '';
	if(!contentType.includes('application/json')) {
		return null;
	}
	return response.json().catch(() => null);
}

function errorMessageFromBody(body: unknown): string {
	const rawMessage = (body as { message?: string | string[] } | null)?.message;
	if(Array.isArray(rawMessage)) {
		return rawMessage.join(' ');
	}
	return rawMessage ?? 'Something went wrong. Please try again.';
}

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

function requestHeaders(options: RequestInit): Headers {
	const headers = new Headers(options.headers);
	if(options.body instanceof FormData) {
		headers.delete('Content-Type');
		return headers;
	}
	if(!headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	return headers;
}

/**
 * Next SSR fetch does not attach the browser Cookie jar — and local SSR talks
 * to the API on loopback — so access_token must be copied from the incoming
 * request. Without this, catalog product SSR returns permissions.canEdit:false
 * for signed-in sellers (PEM-236).
 */
async function serverSessionCookieHeader(): Promise<string | undefined> {
	if(typeof window !== 'undefined') {
		return undefined;
	}
	try {
		const { cookies } = await import('next/headers');
		const jar = cookies();
		const parts: string[] = [];
		const access = jar.get(ACCESS_COOKIE)?.value;
		if(access) {
			parts.push(`${ACCESS_COOKIE}=${access}`);
		}
		// Usually absent on page navigations (cookie path /api/auth).
		const refresh = jar.get(REFRESH_COOKIE)?.value;
		if(refresh) {
			parts.push(`${REFRESH_COOKIE}=${refresh}`);
		}
		return parts.length > 0 ? parts.join('; ') : undefined;
	}
	catch {
		return undefined;
	}
}

async function rawRequest(path: string, options: RequestInit = {}): Promise<Response> {
	const headers = requestHeaders(options);
	if(typeof window === 'undefined' && !headers.has('Cookie')) {
		const cookie = await serverSessionCookieHeader();
		if(cookie) {
			headers.set('Cookie', cookie);
		}
	}
	return fetch(`${API_BASE_URL}${path}`, {
		...options,
		credentials: 'include',
		signal: apiTimeoutSignal(options.signal),
		headers,
	});
}

export async function refreshSession(): Promise<boolean> {
	if(refreshInFlight) {
		return refreshInFlight;
	}

	refreshInFlight = (async () => {
		try {
			const response = await rawRequest('/auth/refresh', { method: 'POST' });
			if(!response.ok) {
				return false;
			}
			const body = await parseJson(response) as { user?: AuthUser } | null;
			return Boolean(body?.user);
		}
		catch {
			return false;
		}
		finally {
			refreshInFlight = null;
		}
	})();

	return refreshInFlight;
}

async function request<T>(
	path: string,
	options: RequestInit = {},
	allowRefresh = true,
): Promise<T> {
	const response = await rawRequest(path, options);
	const body = await parseJson(response);

	if(
		allowRefresh
		&& response.status === 401
		&& path !== '/auth/refresh'
		&& path !== '/auth/login'
		&& path !== '/auth/register'
	) {
		const refreshed = await refreshSession();
		if(refreshed) {
			return request<T>(path, options, false);
		}
	}

	if(!response.ok) {
		throw new AuthApiError(errorMessageFromBody(body), response.status);
	}

	return body as T;
}

/** Shared authenticated fetch used by catalog and other modules. */
export async function authedFetch(
	path: string,
	options: RequestInit = {},
): Promise<Response> {
	const response = await rawRequest(path, options);

	if(response.status !== 401) {
		return response;
	}

	const refreshed = await refreshSession();
	if(!refreshed) {
		return response;
	}

	return rawRequest(path, options);
}

export function registerUser(email: string, password: string): Promise<RegisterResponse> {
	return request<RegisterResponse>('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	}, false);
}

export function verifyEmail(email: string, code: string): Promise<SessionResponse> {
	return request<SessionResponse>('/auth/verify-email', {
		method: 'POST',
		body: JSON.stringify({ email, code }),
	}, false);
}

export function loginUser(email: string, password: string): Promise<PendingLoginResponse> {
	return request<PendingLoginResponse>('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	}, false);
}

export function requestPasswordReset(email: string): Promise<RegisterResponse> {
	return request<RegisterResponse>('/auth/forgot-password', {
		method: 'POST',
		body: JSON.stringify({ email }),
	}, false);
}

export function resetPassword(
	email: string,
	code: string,
	password: string,
): Promise<RegisterResponse> {
	return request<RegisterResponse>('/auth/reset-password', {
		method: 'POST',
		body: JSON.stringify({ email, code, password }),
	}, false);
}

export function verifyLoginOtp(pendingToken: string, code: string): Promise<SessionResponse> {
	return request<SessionResponse>('/auth/login/verify', {
		method: 'POST',
		body: JSON.stringify({ pendingToken, code }),
	}, false);
}

export function logoutUser(): Promise<{ message: string }> {
	return request<{ message: string }>('/auth/logout', { method: 'POST' }, false);
}

export type SessionProbe =
	| { status: 'ok'; user: AuthUser }
	| { status: 'unauthenticated' }
	| { status: 'unavailable'; message: string };

export async function probeCurrentUser(): Promise<SessionProbe> {
	try {
		const result = await request<{ user: AuthUser }>('/auth/me');
		return {
			status: 'ok',
			user: {
				...result.user,
				hasPassword: Boolean(result.user.hasPassword),
			},
		};
	}
	catch(error) {
		if(error instanceof AuthApiError && (error.status === 401 || error.status === 403)) {
			return { status: 'unauthenticated' };
		}
		const message =
			error instanceof Error
				? error.message
				: 'Could not reach the sign-in service.';
		return { status: 'unavailable', message };
	}
}

export async function getCurrentUser(): Promise<AuthUser | null> {
	const probe = await probeCurrentUser();
	return probe.status === 'ok' ? probe.user : null;
}

export function setPassword(
	password: string,
	currentPassword?: string,
): Promise<RegisterResponse> {
	return request<RegisterResponse>('/auth/password', {
		method: 'POST',
		body: JSON.stringify(
			currentPassword
				? { password, currentPassword }
				: { password },
		),
	});
}

export function googleSignInUrl(): string {
	return `${PUBLIC_API_BASE_URL}/auth/google`;
}
