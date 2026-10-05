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
		role: string;
		priceCents: number;
		uom: string;
		availableQty: string;
	}>;
};

export type CatalogOfferingDetail = {
	id: string;
	role: string;
	priceCents: number;
	currency: string;
	qtyOnHand: string;
	availableQty: string;
	tracksOwnQty: boolean;
	uom: { code: string; label: string; dimensionKey: string };
	packLink: {
		pieceOfferingId: string;
		pieceQtyPerPack: string;
		pieceUom: string;
	} | null;
	pieceLink: {
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
	sku: string;
	slug: string;
	title: string;
	description?: string;
	inventoryFromAllocations?: boolean;
	attributes?: Array<{ key: string; value: string; sortOrder?: number }>;
	offerings: Array<{
		uomId: string;
		role: 'STANDALONE' | 'PACK' | 'PIECE';
		priceCents: number;
		currency?: string;
		qtyOnHand?: string;
		tracksOwnQty?: boolean;
	}>;
	packPieceLink?: { pieceQtyPerPack: string };
};

export function createCatalogProduct(payload: CreateProductPayload): Promise<CatalogProductDetail> {
	return catalogRequest<CatalogProductDetail>('/products', {
		method: 'POST',
		body: JSON.stringify(payload),
	});
}
