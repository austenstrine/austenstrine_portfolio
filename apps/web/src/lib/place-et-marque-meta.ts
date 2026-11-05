import {
	getCatalogProduct,
	getCatalogProductById,
	getMyVendor,
	searchCatalogProducts,
} from './catalog-api';

export const PLACE_ET_MARQUE_NAME = 'Place et Marque';

/** Absolute document title so dynamic layouts keep the brand suffix. */
export function absolutePageTitle(segment: string): string {
	const trimmed = segment.trim();
	if(!trimmed || trimmed === PLACE_ET_MARQUE_NAME) {
		return PLACE_ET_MARQUE_NAME;
	}
	if(trimmed.endsWith(` · ${PLACE_ET_MARQUE_NAME}`)) {
		return trimmed;
	}
	return `${trimmed} · ${PLACE_ET_MARQUE_NAME}`;
}

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function humanizeVendorRef(vendorRef: string): string {
	const trimmed = vendorRef.trim();
	if(!trimmed || UUID_RE.test(trimmed)) {
		return 'Vendor';
	}
	return trimmed
		.split(/[-_]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

/** Best-effort display name for seller/buyer tab titles. */
export async function resolveVendorDisplayName(vendorRef: string): Promise<string> {
	const ref = vendorRef.trim();
	if(!ref) {
		return 'Vendor';
	}

	try {
		const catalog = await searchCatalogProducts({
			vendor: ref,
			limit: 1,
		});
		const fromProduct = catalog.items[0]?.vendor.name?.trim();
		if(fromProduct) {
			return fromProduct;
		}
	}
	catch {
		// Public search may miss empty or private catalogs.
	}

	try {
		const mine = await getMyVendor(ref);
		const name = mine.name?.trim();
		if(name) {
			return name;
		}
	}
	catch {
		// Seller endpoint needs a session; fall through.
	}

	return humanizeVendorRef(ref);
}

export async function resolveProductEditTitle(productId: string): Promise<string> {
	try {
		const product = await getCatalogProductById(productId);
		const title = product.title?.trim();
		if(title) {
			return `Edit ${title}`;
		}
	}
	catch {
		// Keep a stable fallback when the product is missing or private.
	}
	return 'Edit product';
}

export async function resolveProductEditTitleBySlug(
	vendorSlug: string,
	productSlug: string,
): Promise<string> {
	try {
		const product = await getCatalogProduct(vendorSlug, productSlug);
		const title = product.title?.trim();
		if(title) {
			return `Edit ${title}`;
		}
	}
	catch {
		// Keep a stable fallback when the product is missing.
	}
	return 'Edit product';
}
