import { AuthApiError, authedFetch } from './auth-api';

export type VendorLinkNameQueueItem = {
	id: string;
	vendorId: string;
	vendorName: string;
	vendorSlug: string;
	requestedSlug: string;
	currentSlug: string;
	status: 'PENDING' | 'APPROVED' | 'DENIED' | 'CANCELLED';
	requesterNote?: string | null;
	reviewReason?: string | null;
	createdAt: string;
	reviewedAt?: string | null;
};

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

async function crmRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await authedFetch(path, options);
	const body = await parseJson(response);
	if(!response.ok) {
		throw new AuthApiError(errorMessageFromBody(body), response.status);
	}
	return body as T;
}

export function listVendorLinkNameRequests(
	status = 'PENDING',
): Promise<VendorLinkNameQueueItem[]> {
	return crmRequest(
		`/catalog/vendors/link-name-requests?status=${encodeURIComponent(status)}`,
	);
}

export function reviewVendorLinkNameRequest(
	requestId: string,
	payload: { decision: 'approve' | 'deny'; reason?: string; note?: string },
): Promise<{
	id: string;
	status: string;
	reviewReason?: string | null;
	vendorSlug: string;
}> {
	return crmRequest(`/catalog/vendors/link-name-requests/${requestId}/review`, {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}
