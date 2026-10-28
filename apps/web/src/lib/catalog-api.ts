import { PUBLIC_API_BASE_URL } from './api';
import { authedFetch } from './auth-api';

export type CatalogProductSummary = {
	id: string;
	vendor: { id?: string; slug: string; name: string };
	category: { slug: string; name: string } | null;
	sku: string;
	slug: string;
	title: string;
	description: string | null;
	imageUrls?: string[];
	tags?: string[];
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

export type CatalogProductAttribute = {
	id: string;
	attributeId: string;
	attributeName: string;
	value: string;
	sortOrder: number;
};

export type CatalogAttributeDefinition = {
	id: string;
	name: string;
	vendorId: string | null;
	valueKind?: 'OPTION' | 'SCALAR_STRING' | 'SCALAR_NUMBER' | 'SCALAR_BOOLEAN';
	unit?: string | null;
	minNumeric?: string | null;
	maxNumeric?: string | null;
	values: Array<{
		id: string;
		value: string;
		vendorId: string | null;
		parentId: string | null;
		groupId?: string | null;
		categoryIds?: string[];
		sortOrder: number;
	}>;
};

export type CatalogSearchFilter = {
	attributeId: string;
	attributeName: string;
	valueId: string;
	value: string;
	rollupValue?: string;
	source: 'auto' | 'manual';
};

export type CatalogSearchFacet = {
	attributeId: string;
	attributeName: string;
	buckets: Array<{ valueId: string; value: string; count: number }>;
};

export type CatalogTermFacet = {
	slug: string;
	count: number;
};

export type CatalogSearchResult = {
	items: CatalogProductSummary[];
	appliedFilters: CatalogSearchFilter[];
	facets: CatalogSearchFacet[];
	categoryFacets?: CatalogTermFacet[];
	vendorFacets?: CatalogTermFacet[];
	total?: number;
	source?: 'opensearch' | 'prisma';
};

export type ProductMeasuresPayload = {
	lengthNumeric?: string | null;
	widthNumeric?: string | null;
	heightNumeric?: string | null;
	linearUnit?: string | null;
	weightNumeric?: string | null;
	weightUnit?: string | null;
	packageLengthNumeric?: string | null;
	packageWidthNumeric?: string | null;
	packageHeightNumeric?: string | null;
	packageLinearUnit?: string | null;
	packageWeightNumeric?: string | null;
	packageWeightUnit?: string | null;
	volumeNumeric?: string | null;
	volumeUnit?: string | null;
	netContentNumeric?: string | null;
	netContentUnit?: string | null;
	piecesPerRetailUnit?: number | null;
	voltageNumeric?: string | null;
	wattageNumeric?: string | null;
	amperageNumeric?: string | null;
	frequencyHzNumeric?: string | null;
	capacityNumeric?: string | null;
	capacityUnit?: string | null;
	gtin?: string | null;
	mpn?: string | null;
	countryOfOrigin?: string | null;
	condition?: 'NEW' | 'USED' | 'REFURBISHED' | 'NA';
	releaseAt?: string | null;
	expiresAt?: string | null;
};

export type CatalogProductDetail = Omit<CatalogProductSummary, 'offerings'> & ProductMeasuresPayload & {
	attributes: CatalogProductAttribute[];
	scalarValues?: Array<{
		attributeId: string;
		attributeName: string;
		valueKind: string;
		stringValue: string | null;
		numericValue: string | null;
		booleanValue: boolean | null;
	}>;
	offerings: CatalogOfferingDetail[];
	permissions: { canEdit: boolean };
};

async function catalogRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const headers = new Headers(options.headers);
	if(!(options.body instanceof FormData) && !headers.has('Content-Type')) {
		headers.set('Content-Type', 'application/json');
	}
	const response = await authedFetch(`/catalog${path}`, {
		...options,
		headers,
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
	limit?: number;
	offset?: number;
	sort?: string;
	inStock?: boolean;
	rollupValueIds?: string[];
	omitValueIds?: string[];
}): Promise<CatalogSearchResult> {
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
	if(params.limit) {
		query.set('limit', String(params.limit));
	}
	if(params.offset) {
		query.set('offset', String(params.offset));
	}
	if(params.sort) {
		query.set('sort', params.sort);
	}
	if(params.inStock) {
		query.set('inStock', '1');
	}
	for(const id of params.rollupValueIds ?? []) {
		query.append('rollupValueId', id);
	}
	for(const id of params.omitValueIds ?? []) {
		query.append('omitValueId', id);
	}

	const suffix = query.toString() ? `?${query.toString()}` : '';
	return catalogRequest<CatalogSearchResult>(`/products${suffix}`);
}

export function getCatalogProduct(
	vendorSlug: string,
	productSlug: string,
): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>(`/products/${vendorSlug}/${productSlug}`);
}

export function getCatalogProductById(
	productId: string,
): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>(`/products/by-id/${productId}`);
}

export function listCatalogAttributes(
	vendorId?: string,
): Promise<CatalogAttributeDefinition[]> {
	const query = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
	return catalogRequest<CatalogAttributeDefinition[]>(`/attributes${query}`);
}

export function createCatalogAttribute(payload: {
	name: string;
	vendorId?: string;
	asGlobal?: boolean;
	valueKind?: CatalogAttributeDefinition['valueKind'];
}): Promise<CatalogAttributeDefinition> {
	return catalogRequest('/attributes', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function upsertVendorAttributeValue(payload: {
	vendorId: string;
	attributeId: string;
	value: string;
	parentId?: string;
	categoryIds: string[];
	groupId?: string;
}): Promise<CatalogAttributeDefinition['values'][number]> {
	return catalogRequest('/attributes/values', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function createGlobalAttributeValue(payload: {
	attributeId: string;
	value: string;
}): Promise<CatalogAttributeDefinition['values'][number]> {
	return catalogRequest('/attributes/values/global', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function updateCatalogProduct(
	productId: string,
	payload: ProductMeasuresPayload & {
		title?: string;
		description?: string;
		imageUrls?: string[];
		tags?: string[];
		categoryId?: string | null;
		inventoryFromAllocations?: boolean;
		breakFeeMode?: 'OFF' | 'PER_PARENT_OPENED' | 'ONCE_PER_LINE' | 'PRODUCT_ONCE';
		breakFeeCents?: number;
		attributeValueIds?: string[];
		scalarValues?: Array<{
			attributeId: string;
			stringValue?: string | null;
			numericValue?: string | null;
			booleanValue?: boolean | null;
		}>;
		offerings?: Array<{
			id: string;
			sku?: string;
			priceCents?: number;
			qtyOnHand?: string;
			tracksOwnQty?: boolean;
			minUnbrokenQty?: string;
			breakPoolAboveQty?: string;
			inheritQtyToChildren?: boolean;
		}>;
	},
): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>(`/products/${productId}`, {
		method: 'PATCH',
		body: JSON.stringify(payload),
	});
}

export type CatalogCategoryRow = {
	id: string;
	slug: string;
	name: string;
	imageUrl?: string | null;
	parentId?: string | null;
	parent?: { id: string; name: string; slug: string } | null;
	_count?: { products: number; children: number };
};

export function listCatalogCategories(): Promise<CatalogCategoryRow[]> {
	return catalogRequest('/categories');
}

export function createCatalogCategory(payload: {
	name: string;
	slug: string;
	parentId?: string;
	imageUrl?: string;
}): Promise<CatalogCategoryRow> {
	return catalogRequest('/categories', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function updateCatalogCategory(
	categoryId: string,
	payload: { imageUrl?: string | null },
): Promise<CatalogCategoryRow> {
	return catalogRequest(`/categories/${categoryId}`, {
		method: 'PATCH',
		body: JSON.stringify(payload),
	});
}

export type CatalogMediaUpload = {
	path: string;
	url: string;
	imageUrls?: string[];
};

export function uploadCatalogMedia(input: {
	file: File;
	kind?: 'product' | 'category';
	productId?: string;
	categoryId?: string;
	vendorId?: string;
	alt?: string;
}): Promise<CatalogMediaUpload> {
	const body = new FormData();
	body.append('file', input.file);
	if(input.kind) {
		body.append('kind', input.kind);
	}
	if(input.productId) {
		body.append('productId', input.productId);
	}
	if(input.categoryId) {
		body.append('categoryId', input.categoryId);
	}
	if(input.vendorId) {
		body.append('vendorId', input.vendorId);
	}
	if(input.alt) {
		body.append('alt', input.alt);
	}
	return catalogRequest('/media', {
		method: 'POST',
		body,
	});
}

export function requestCatalogCategory(payload: {
	name: string;
	suggestedParent?: string;
	note?: string;
}): Promise<{ message: string }> {
	return catalogRequest('/categories/request', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function listPopularTags(params?: {
	vendorId?: string;
	limit?: number;
}): Promise<Array<{ tag: string; count: number }>> {
	const query = new URLSearchParams();
	if(params?.vendorId) {
		query.set('vendorId', params.vendorId);
	}
	if(params?.limit) {
		query.set('limit', String(params.limit));
	}
	const suffix = query.toString() ? `?${query.toString()}` : '';
	return catalogRequest(`/tags/popular${suffix}`);
}

export type VendorSummary = {
	id: string;
	name: string;
	slug: string;
	isSuperVendor?: boolean;
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
	vendorId?: string | null;
	aliases?: string[];
	vendor?: { id: string; name: string; slug: string } | null;
};

export function listUoms(vendorId?: string): Promise<UnitOfMeasure[]> {
	const query = vendorId ? `?vendorId=${encodeURIComponent(vendorId)}` : '';
	return catalogRequest<UnitOfMeasure[]>(`/uoms${query}`);
}

export function createUom(payload: {
	code: string;
	label: string;
	dimensionKey: string;
	factorToReference: string;
	vendorId?: string;
	aliases?: string[];
}): Promise<UnitOfMeasure> {
	return catalogRequest<UnitOfMeasure>('/uoms', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}

export function applyUomMerge(token: string): Promise<{
	message: string;
	action: string;
	nameKey: string;
}> {
	return catalogRequest(
		`/uom-merges/apply?token=${encodeURIComponent(token)}`,
	);
}

export type CreateProductPayload = ProductMeasuresPayload & {
	vendorId: string;
	categoryId?: string;
	sku?: string;
	slug: string;
	title: string;
	description?: string;
	imageUrls?: string[];
	tags?: string[];
	inventoryFromAllocations?: boolean;
	breakFeeMode?: 'OFF' | 'PER_PARENT_OPENED' | 'ONCE_PER_LINE' | 'PRODUCT_ONCE';
	breakFeeCents?: number;
	attributeValueIds?: string[];
	scalarValues?: Array<{
		attributeId: string;
		stringValue?: string | null;
		numericValue?: string | null;
		booleanValue?: boolean | null;
	}>;
	offerings: Array<{
		clientKey?: string;
		offeringKey?: string;
		sku?: string;
		uomId: string;
		role: 'PACK' | 'PIECE';
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
	return `${PUBLIC_API_BASE_URL}/catalog/imports/template.csv`;
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
