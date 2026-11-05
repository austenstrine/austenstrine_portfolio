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

export type CatalogCategoryRow = {
	id: string;
	slug: string;
	name: string;
	imageUrl?: string | null;
	parentId?: string | null;
	parent?: { id: string; name: string; slug: string } | null;
	_count?: { products: number; children: number };
};

export type UnitOfMeasure = {
	id: string;
	code: string;
	label: string;
	aliases: string[];
	dimensionKey: string;
	factorToReference: string;
	vendorId?: string | null;
};

export type CatalogMediaUpload = {
	path: string;
	url: string;
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

export function listCatalogCategories(): Promise<CatalogCategoryRow[]> {
	return crmRequest('/catalog/categories');
}

export function createCatalogCategory(payload: {
	name: string;
	slug: string;
	parentId?: string;
	imageUrl?: string;
}): Promise<CatalogCategoryRow> {
	return crmRequest('/catalog/categories', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function updateCatalogCategory(
	categoryId: string,
	payload: { imageUrl?: string | null },
): Promise<CatalogCategoryRow> {
	return crmRequest(`/catalog/categories/${categoryId}`, {
		method: 'PATCH',
		body: JSON.stringify(payload),
	});
}

export function uploadCategoryMedia(input: {
	file: File;
	categoryId?: string;
}): Promise<CatalogMediaUpload> {
	const body = new FormData();
	body.append('file', input.file);
	body.append('kind', 'category');
	if(input.categoryId) {
		body.append('categoryId', input.categoryId);
	}
	return crmRequest('/catalog/media', {
		method: 'POST',
		body,
	});
}

export function listUoms(): Promise<UnitOfMeasure[]> {
	return crmRequest('/catalog/uoms');
}

export function createGlobalUom(payload: {
	code: string;
	label: string;
	dimensionKey: string;
	factorToReference: string;
	aliases?: string[];
}): Promise<UnitOfMeasure> {
	return crmRequest('/catalog/uoms', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function applyUomMerge(token: string): Promise<{
	message: string;
	action: string;
	nameKey: string;
}> {
	return crmRequest(
		`/catalog/uom-merges/apply?token=${encodeURIComponent(token)}`,
	);
}
