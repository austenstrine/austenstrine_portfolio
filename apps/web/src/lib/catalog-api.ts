import { API_BASE_URL } from './api';
import { authedFetch } from './auth-api';

export type CatalogProductSummary = {
	id: string;
	vendor: { slug: string; name: string };
	category: { slug: string; name: string } | null;
	sku: string;
	slug: string;
	title: string;
	description: string | null;
	inventoryFromAllocations: boolean;
	primaryPriceCents: number | null;
	primaryUom: string | null;
	availableQty: string;
	offerings: Array<{
		id: string;
		sku?: string;
		offeringKey?: string;
		role: string;
		priceCents: number;
		uom: string;
		availableQty: string;
	}>;
	breakFeeMode?: string;
	breakFeeCents?: number;
};

export type CatalogOfferingDetail = {
	id: string;
	sku?: string;
	offeringKey?: string;
	role: string;
	priceCents: number;
	currency: string;
	qtyOnHand: string;
	availableQty: string;
	tracksOwnQty: boolean;
	minUnbrokenQty?: string;
	breakPoolAboveQty?: string;
	inheritQtyToChildren?: boolean;
	uom: { code: string; label: string; dimensionKey: string };
	childContainments?: Array<{
		id: string;
		childOfferingId: string;
		childSku: string;
		childQtyPerParent: string;
		breakFeeCents: number | null;
		childUom: string;
	}>;
	parentContainments?: Array<{
		id: string;
		parentOfferingId: string;
		parentSku: string;
		childQtyPerParent: string;
		breakFeeCents: number | null;
		parentUom: string;
	}>;
	/** @deprecated Prefer containments */
	packLink?: {
		pieceOfferingId: string;
		pieceQtyPerPack: string;
		pieceUom: string;
	} | null;
	/** @deprecated Prefer containments */
	pieceLink?: {
		packOfferingId: string;
		pieceQtyPerPack: string;
		packUom: string;
	} | null;
};

export type CatalogProductDetail = Omit<CatalogProductSummary, 'offerings'> & {
	attributes: Array<{ key: string; value: string; sortOrder: number }>;
	offerings: CatalogOfferingDetail[];
	permissions: { canEdit: boolean };
};

async function catalogRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await authedFetch(`/catalog${path}`, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
	});

	const body = await response.json().catch(() => null);
	if(!response.ok) {
		const message = body?.message ?? 'Catalog request failed.';
		throw new Error(Array.isArray(message) ? message.join(' ') : message);
	}

	return body as T;
}

export function searchCatalogProducts(params: {
	q?: string;
	category?: string;
	vendor?: string;
}): Promise<CatalogProductSummary[]> {
	const query = new URLSearchParams();
	if(params.q) {
		query.set('q', params.q);
	}
	if(params.category) {
		query.set('category', params.category);
	}
	if(params.vendor) {
		query.set('vendor', params.vendor);
	}

	const suffix = query.toString() ? `?${query.toString()}` : '';
	return catalogRequest<CatalogProductSummary[]>(`/products${suffix}`);
}

export function getCatalogProduct(
	vendorSlug: string,
	productSlug: string,
): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>(`/products/${vendorSlug}/${productSlug}`);
}

export function updateCatalogProduct(
	productId: string,
	payload: {
		title?: string;
		description?: string;
		offerings?: Array<{
			id: string;
			priceCents?: number;
			qtyOnHand?: string;
		}>;
	},
): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>(`/products/${productId}`, {
		method: 'PATCH',
		body: JSON.stringify(payload),
	});
}

export function listCatalogCategories(): Promise<
	Array<{
		id: string;
		slug: string;
		name: string;
		parentId?: string | null;
		parent?: { id: string; name: string; slug: string } | null;
		_count?: { products: number; children: number };
	}>
> {
	return catalogRequest('/categories');
}

export function createCatalogCategory(payload: {
	name: string;
	slug: string;
	parentId?: string;
}): Promise<{
	id: string;
	slug: string;
	name: string;
}> {
	return catalogRequest('/categories', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export type VendorSummary = {
	id: string;
	name: string;
	slug: string;
	createdAt: string;
	productCount: number;
	memberCount: number;
	myRole: 'OWNER' | 'EDITOR' | 'VIEWER';
	joinedAt?: string;
};

export type VendorDetail = VendorSummary & {
	members: Array<{
		userId: string;
		email: string;
		role: 'OWNER' | 'EDITOR' | 'VIEWER';
		joinedAt: string;
	}>;
};

export function listMyVendors(): Promise<VendorSummary[]> {
	return catalogRequest<VendorSummary[]>('/vendors/mine');
}

export function getMyVendor(vendorId: string): Promise<VendorDetail> {
	return catalogRequest<VendorDetail>(`/vendors/mine/${vendorId}`);
}

export function createVendor(payload: { name: string; slug: string }): Promise<VendorSummary> {
	return catalogRequest<VendorSummary>('/vendors', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export type VendorInviteSummary = {
	id: string;
	email: string;
	role: 'EDITOR' | 'VIEWER' | 'OWNER';
	expiresAt: string;
	createdAt: string;
};

export type VendorInvitePeek = {
	email: string;
	role: 'EDITOR' | 'VIEWER' | 'OWNER';
	expiresAt: string;
	vendorName: string;
	vendorSlug: string;
};

export type AcceptVendorInviteResult = {
	vendorId: string;
	vendorName: string;
	vendorSlug: string;
	role: 'EDITOR' | 'VIEWER' | 'OWNER';
	alreadyMember: boolean;
};

export function listVendorInvites(vendorId: string): Promise<VendorInviteSummary[]> {
	return catalogRequest<VendorInviteSummary[]>(`/vendors/${vendorId}/invites`);
}

export function createVendorInvite(
	vendorId: string,
	payload: { email: string; role?: 'EDITOR' | 'VIEWER' },
): Promise<VendorInviteSummary> {
	return catalogRequest<VendorInviteSummary>(`/vendors/${vendorId}/invites`, {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function revokeVendorInvite(vendorId: string, inviteId: string): Promise<{ message: string }> {
	return catalogRequest<{ message: string }>(`/vendors/${vendorId}/invites/${inviteId}`, {
		method: 'DELETE',
	});
}

export function peekVendorInvite(token: string): Promise<VendorInvitePeek> {
	return catalogRequest<VendorInvitePeek>(
		`/invites/peek?token=${encodeURIComponent(token)}`,
	);
}

export function acceptVendorInvite(token: string): Promise<AcceptVendorInviteResult> {
	return catalogRequest<AcceptVendorInviteResult>('/invites/accept', {
		method: 'POST',
		body: JSON.stringify({ token }),
	});
}

export type UnitOfMeasure = {
	id: string;
	code: string;
	label: string;
	dimensionKey: string;
	factorToReference: string;
};

export function listUoms(): Promise<UnitOfMeasure[]> {
	return catalogRequest<UnitOfMeasure[]>('/uoms');
}

export function createUom(payload: {
	code: string;
	label: string;
	dimensionKey: string;
	factorToReference: string;
}): Promise<UnitOfMeasure> {
	return catalogRequest<UnitOfMeasure>('/uoms', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export type CreateProductPayload = {
	vendorId: string;
	categoryId?: string;
	sku?: string;
	slug: string;
	title: string;
	description?: string;
	inventoryFromAllocations?: boolean;
	breakFeeMode?: 'OFF' | 'PER_PARENT_OPENED' | 'ONCE_PER_LINE' | 'PRODUCT_ONCE';
	breakFeeCents?: number;
	attributes?: Array<{ key: string; value: string; sortOrder?: number }>;
	offerings: Array<{
		clientKey?: string;
		offeringKey?: string;
		sku?: string;
		uomId: string;
		role: 'STANDALONE' | 'PACK' | 'PIECE';
		priceCents: number;
		currency?: string;
		qtyOnHand?: string;
		tracksOwnQty?: boolean;
		minUnbrokenQty?: string;
		breakPoolAboveQty?: string;
		inheritQtyToChildren?: boolean;
	}>;
	containments?: Array<{
		parentOfferingKey: string;
		childOfferingKey: string;
		childQtyPerParent: string;
		breakFeeCents?: number;
	}>;
	packPieceLink?: { pieceQtyPerPack: string };
};

export function createCatalogProduct(payload: CreateProductPayload): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>('/products', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export type VendorAppPassword = {
	id: string;
	name: string;
	tokenPrefix: string;
	hint: string;
	active: boolean;
	lastUsedAt: string | null;
	revokedAt: string | null;
	createdAt: string;
};

export type CreatedVendorAppPassword = {
	id: string;
	name: string;
	tokenPrefix: string;
	hint: string;
	token: string;
	warning: string;
	createdAt: string;
};

export function listVendorAppPasswords(vendorId: string): Promise<VendorAppPassword[]> {
	return catalogRequest<VendorAppPassword[]>(`/vendors/${vendorId}/app-passwords`);
}

export function createVendorAppPassword(
	vendorId: string,
	name?: string,
): Promise<CreatedVendorAppPassword> {
	return catalogRequest<CreatedVendorAppPassword>(`/vendors/${vendorId}/app-passwords`, {
		method: 'POST',
		body: JSON.stringify({ name }),
	});
}

export function revokeVendorAppPassword(
	vendorId: string,
	passwordId: string,
): Promise<{ id: string; revokedAt: string | null }> {
	return catalogRequest(`/vendors/${vendorId}/app-passwords/${passwordId}`, {
		method: 'DELETE',
	});
}

export type CatalogImportValidation = {
	delimiter: ',' | '\t';
	rowCount: number;
	blockingErrorCount: number;
	warningCount: number;
	createProductCount: number;
	updateProductCount: number;
	createOfferingCount: number;
	updateOfferingCount: number;
	errors: Array<{
		lineNumber: number;
		column?: string;
		message: string;
		blocking: boolean;
	}>;
	ok: boolean;
};

export type CatalogImportJob = {
	id: string;
	status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
	rowCount: number;
	createdCount: number;
	updatedCount: number;
	errorCount: number;
	errors: CatalogImportValidation['errors'] | null;
	createdAt: string;
	finishedAt: string | null;
};

export function validateCatalogImport(
	vendorId: string,
	csv: string,
): Promise<CatalogImportValidation> {
	return catalogRequest<CatalogImportValidation>(`/vendors/${vendorId}/imports/validate`, {
		method: 'POST',
		body: JSON.stringify({ csv, source: 'UI' }),
	});
}

export function commitCatalogImport(
	vendorId: string,
	csv: string,
): Promise<{ jobId: string; status: string }> {
	return catalogRequest(`/vendors/${vendorId}/imports/commit`, {
		method: 'POST',
		body: JSON.stringify({ csv, source: 'UI' }),
	});
}

export function getCatalogImportJob(
	vendorId: string,
	jobId: string,
): Promise<CatalogImportJob> {
	return catalogRequest<CatalogImportJob>(`/vendors/${vendorId}/imports/${jobId}`);
}

export function catalogImportTemplateUrl(): string {
	return `${API_BASE_URL}/catalog/imports/template.csv`;
}

export type CatalogDeleteResult = {
	archiveBatchId: string;
	deletedCount: number;
	productSlugs: string[];
	emailedTo: string[];
	csvAttached: boolean;
};

export function deleteCatalogProduct(productId: string): Promise<CatalogDeleteResult> {
	return catalogRequest<CatalogDeleteResult>(`/products/${productId}`, {
		method: 'DELETE',
	});
}

export function deleteVendorCatalogProducts(
	vendorId: string,
	payload: { productIds?: string[]; productSlugs?: string[] },
): Promise<CatalogDeleteResult> {
	return catalogRequest<CatalogDeleteResult>(`/vendors/${vendorId}/products/delete`, {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}
