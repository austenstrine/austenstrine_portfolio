import { API_BASE_URL } from './api';

export type AuthUser = {
	id: string;
	email: string;
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

async function rawRequest(path: string, options: RequestInit = {}): Promise<Response> {
	return fetch(`${API_BASE_URL}${path}`, {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
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
		} catch {
			return false;
		} finally {
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

export async function getCurrentUser(): Promise<AuthUser | null> {
	try {
		const result = await request<{ user: AuthUser }>('/auth/me');
		return result.user;
	} catch {
		return null;
	}
}

export function googleSignInUrl(): string {
	return `${API_BASE_URL}/auth/google`;
}
