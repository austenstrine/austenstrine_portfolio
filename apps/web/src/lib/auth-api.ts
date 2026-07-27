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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		...options,
		credentials: 'include',
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	const contentType = response.headers.get('content-type') ?? '';
	const body = contentType.includes('application/json')
		? await response.json().catch(() => null)
		: null;

	if (!response.ok) {
		const rawMessage = body?.message;
		const message = Array.isArray(rawMessage)
			? rawMessage.join(' ')
			: rawMessage ?? 'Something went wrong. Please try again.';

		throw new AuthApiError(message, response.status);
	}

	return body as T;
}

export function registerUser(email: string, password: string): Promise<RegisterResponse> {
	return request<RegisterResponse>('/auth/register', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	});
}

export function verifyEmail(email: string, code: string): Promise<SessionResponse> {
	return request<SessionResponse>('/auth/verify-email', {
		method: 'POST',
		body: JSON.stringify({ email, code }),
	});
}

export function loginUser(email: string, password: string): Promise<PendingLoginResponse> {
	return request<PendingLoginResponse>('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	});
}

export function verifyLoginOtp(pendingToken: string, code: string): Promise<SessionResponse> {
	return request<SessionResponse>('/auth/login/verify', {
		method: 'POST',
		body: JSON.stringify({ pendingToken, code }),
	});
}

export function logoutUser(): Promise<{ message: string }> {
	return request<{ message: string }>('/auth/logout', { method: 'POST' });
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
