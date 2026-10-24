export const API_FETCH_TIMEOUT_MS = 4000;

export function apiTimeoutSignal(
	existing?: AbortSignal | null,
	ms = API_FETCH_TIMEOUT_MS,
): AbortSignal {
	const timeout = AbortSignal.timeout(ms);
	if(!existing) {
		return timeout;
	}
	if(typeof AbortSignal.any === 'function') {
		return AbortSignal.any([existing, timeout]);
	}
	return timeout;
}
