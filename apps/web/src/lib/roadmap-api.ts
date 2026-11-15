import { API_BASE_URL } from './api';
import { apiTimeoutSignal } from './timed-fetch';
import { authedFetch } from './auth-api';

export type SubmitRoadmapSuggestionInput = {
	body: string;
	name?: string;
	email?: string;
	/** Honeypot — must stay empty. */
	website?: string;
};

export class RoadmapApiError extends Error {
	status: number;

	constructor(message: string, status: number) {
		super(message);
		this.name = 'RoadmapApiError';
		this.status = status;
	}
}

export async function submitRoadmapSuggestion(
	input: SubmitRoadmapSuggestionInput,
): Promise<{ ok: true }> {
	const response = await authedFetch('/roadmap/suggestions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(input),
		cache: 'no-store',
		signal: apiTimeoutSignal(),
	});

	const body = await response.json().catch(() => null);
	if(!response.ok) {
		const message = body?.message ?? 'Could not send suggestion.';
		throw new RoadmapApiError(
			Array.isArray(message) ? message.join(' ') : String(message),
			response.status,
		);
	}

	return { ok: true };
}

/** Dev-only sanity: base used by SSR helpers if needed later. */
export function roadmapApiBase(): string {
	return API_BASE_URL;
}
