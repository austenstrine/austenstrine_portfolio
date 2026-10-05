import { API_BASE_URL } from './api';

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

export type CatalogProductDetail = CatalogProductSummary & {
	attributes: Array<{ key: string; value: string; sortOrder: number }>;
	offerings: Array<{
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
	}>;
	permissions: { canEdit: boolean };
};

async function catalogRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
	const response = await fetch(`${API_BASE_URL}/catalog${path}`, {
		...options,
		credentials: 'include',
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

export function listCatalogCategories(): Promise<Array<{ id: string; slug: string; name: string }>> {
	return catalogRequest('/categories');
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
