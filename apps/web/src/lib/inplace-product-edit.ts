import {
	listCatalogCategories,
	listUoms,
	type CatalogCategoryRow,
	type CatalogProductDetail,
	type CatalogProductSummary,
	type UnitOfMeasure,
} from './catalog-api';

let categoriesCache: Promise<CatalogCategoryRow[]> | null = null;
const uomsCache = new Map<string, Promise<UnitOfMeasure[]>>();

export function loadInPlaceCategories() {
	if(!categoriesCache) {
		categoriesCache = listCatalogCategories().catch((error) => {
			categoriesCache = null;
			throw error;
		});
	}
	return categoriesCache;
}

export function loadInPlaceUoms(vendorId: string) {
	const cached = uomsCache.get(vendorId);
	if(cached) {
		return cached;
	}
	const next = listUoms(vendorId).catch((error) => {
		uomsCache.delete(vendorId);
		throw error;
	});
	uomsCache.set(vendorId, next);
	return next;
}

export function applyDetailToSummary(
	summary: CatalogProductSummary,
	detail: CatalogProductDetail,
): CatalogProductSummary {
	const primary = detail.offerings[0];
	return {
		...summary,
		title: detail.title,
		description: detail.description,
		tags: detail.tags,
		slug: detail.slug,
		imageUrls: detail.imageUrls,
		category: detail.category,
		inventoryFromAllocations: detail.inventoryFromAllocations,
		primaryPriceCents: primary?.priceCents ?? summary.primaryPriceCents,
		primaryUom: primary?.uom.code ?? summary.primaryUom,
		availableQty: primary?.availableQty ?? summary.availableQty,
		offerings: detail.offerings.map((offering) => ({
			id: offering.id,
			sku: offering.sku,
			offeringKey: offering.offeringKey,
			role: offering.role,
			priceCents: offering.priceCents,
			uom: offering.uom.code,
			omitFromAvailability: offering.uom.omitFromAvailability,
			availableQty: offering.availableQty,
		})),
	};
}

export function categoryIdForSlug(
	categories: CatalogCategoryRow[],
	slug: string | null | undefined,
) {
	if(!slug) {
		return '';
	}
	return categories.find((row) => row.slug === slug)?.id ?? '';
}

export function uomIdForCode(
	uoms: UnitOfMeasure[],
	code: string | null | undefined,
) {
	if(!code) {
		return '';
	}
	return uoms.find((row) => row.code === code)?.id ?? '';
}

/** Quiet chrome so in-place controls read as listing/PDP copy until focused. */
export const inPlaceQuietFieldClassName = `
	w-full
	rounded-sm
	border
	border-transparent
	bg-transparent
	px-0
	py-0
	outline-none
	transition
	hover:border-slate-300
	focus:border-asgreen/50
	disabled:opacity-60
`;
