import { authedFetch } from './auth-api';
import { CatalogApiError } from './catalog-api';

export type VendorPublicProfile = {
	tagline: string | null;
	about: string | null;
	locationLabel: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
	websiteUrl: string | null;
};

export type PublicVendor = VendorPublicProfile & {
	id: string;
	name: string;
	slug: string;
	productCount: number;
};

export async function getPublicVendor(vendorSlug: string): Promise<PublicVendor> {
	const response = await authedFetch(
		`/catalog/vendors/public/${encodeURIComponent(vendorSlug)}`,
		{ cache: 'no-store' },
	);
	const body = await response.json().catch(() => null);
	if(!response.ok) {
		const message = body?.message ?? 'Catalog request failed.';
		throw new CatalogApiError(
			Array.isArray(message) ? message.join(' ') : message,
			response.status,
		);
	}
	return body as PublicVendor;
}
