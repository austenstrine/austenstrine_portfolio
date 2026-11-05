const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuidLike(value: string): boolean {
	return UUID_PATTERN.test(value.trim());
}

/** Prefer the human link name; fall back to id when slug is missing. */
export function vendorUrlRef(vendor: {
	id: string;
	slug?: string | null;
}): string {
	const slug = vendor.slug?.trim();
	return slug || vendor.id;
}

export function matchVendorByRef<T extends { id: string; slug: string }>(
	vendors: T[],
	ref: string,
): T | null {
	const trimmed = ref.trim();
	if(!trimmed) {
		return null;
	}
	return vendors.find((row) => row.id === trimmed || row.slug === trimmed) ?? null;
}

type ProductCreateHrefOptions = {
	surface?: 'standard' | 'advanced';
	vendor?: { id: string; slug?: string | null } | null;
	/** Raw query ref (slug or id). Used when a vendor object is not handy. */
	vendorRef?: string | null;
	categoryId?: string | null;
};

/** Build /products/new or /products/configure with a human-friendly vendorId query. */
export function productCreateHref(options: ProductCreateHrefOptions = {}): string {
	const base = options.surface === 'advanced'
		? '/place-et-marque/products/configure'
		: '/place-et-marque/products/new';
	const params = new URLSearchParams();
	const ref = options.vendorRef?.trim()
		|| (options.vendor
			? vendorUrlRef(options.vendor)
			: '');
	if(ref) {
		params.set('vendorId', ref);
	}
	if(options.categoryId?.trim()) {
		params.set('categoryId', options.categoryId.trim());
	}
	const query = params.toString();
	return query
		? `${base}?${query}`
		: base;
}

type ProductPathParts = {
	vendorSlug: string;
	productSlug: string;
};

function encodeProductPath({ vendorSlug, productSlug }: ProductPathParts): string {
	return `/place-et-marque/${encodeURIComponent(vendorSlug)}/${encodeURIComponent(productSlug)}`;
}

/** Public product page: /place-et-marque/<vendor>/<product> */
export function productViewHref(parts: ProductPathParts): string {
	return encodeProductPath(parts);
}

/** Edit/configure under the same slug path as the public product page. */
export function productEditHref(
	parts: ProductPathParts,
	surface: 'standard' | 'advanced' = 'standard',
): string {
	const base = encodeProductPath(parts);
	return surface === 'advanced'
		? `${base}/configure`
		: `${base}/edit`;
}

/** Legacy UUID edit/configure paths (kept for redirects). */
export function productEditHrefById(
	productId: string,
	surface: 'standard' | 'advanced' = 'standard',
): string {
	return surface === 'advanced'
		? `/place-et-marque/products/${encodeURIComponent(productId)}/configure`
		: `/place-et-marque/products/${encodeURIComponent(productId)}/edit`;
}
