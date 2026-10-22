export function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export function pricePerLabel(uom?: { label: string } | null): string {
	if(!uom) {
		return 'Price ($)';
	}
	return `Price ($ / ${uom.label.toLowerCase()})`;
}

export function dollarsToCents(value: string): number {
	const parsed = Number(value);
	if(Number.isNaN(parsed) || parsed < 0) {
		return 0;
	}
	return Math.round(parsed * 100);
}

export function centsToDollars(cents: number): string {
	return (cents / 100).toFixed(2);
}

/**
 * Which catalog workspace the editor is opened from.
 * - standard: advanced feature toggles are visible and default OFF
 * - advanced: every advanced feature is forced ON and toggle chrome is hidden
 */
export type ProductEditorSurface = 'standard' | 'advanced';

/** Create a new listing vs edit an existing product id. */
export type ProductEditorIntent = 'create' | 'edit';

/**
 * Progressive-disclosure sections on the standard surface.
 * Each key is revealed in place by a relevant question (not a top-of-page checkbox list).
 * On the advanced surface these are all forced open with no prompt chrome.
 */
export type AdvancedFeatureKey =
	| 'packsAndPieces'
	| 'breakFees'
	| 'packBreakRules'
	| 'variants';

/** Button / prompt copy shown where a collapsed section would appear. */
export const ADVANCED_FEATURE_PROMPTS: Record<AdvancedFeatureKey, string> = {
	packsAndPieces: 'Does this product break down into another SKU?',
	breakFees: 'Charge a fee when a pack is opened?',
	packBreakRules: 'Set rules for how this pack breaks?',
	variants: 'Does this have separately priced variants?',
};

export const DEFAULT_ADVANCED_FEATURE_TOGGLES: Record<AdvancedFeatureKey, boolean> = {
	packsAndPieces: false,
	breakFees: false,
	packBreakRules: false,
	variants: false,
};

export type CatalogWorkspace = ProductEditorSurface;

export const CATALOG_WORKSPACE_LABELS: Record<
	CatalogWorkspace,
	{ title: string; short: string }
> = {
	standard: {
		title: 'Standard listing',
		short: 'Standard listing',
	},
	advanced: {
		title: 'Advanced product',
		short: 'Advanced product',
	},
};

/** Pack or piece row edited in the focused pack/piece switcher. */
export type PackOrPieceDraft = {
	/** Stable client key used for containments before server ids exist. */
	clientKey: string;
	/** Existing ProductOffering id when editing. */
	id?: string;
	role: 'PACK' | 'PIECE';
	label: string;
	sku: string;
	uomId: string;
	price: string;
	qtyOnHand: string;
	/** When true, this pack can supply child qty via containment / break rules. */
	breakable: boolean;
	minUnbrokenQty: string;
	breakPoolAboveQty: string;
	inheritQtyToChildren: boolean;
};

export type ContainmentDraft = {
	parentClientKey: string;
	childClientKey: string;
	childQtyPerParent: string;
	breakFeeCents?: string;
};

export function createPackOrPieceDraft(
	role: 'PACK' | 'PIECE',
	partial?: Partial<PackOrPieceDraft>,
): PackOrPieceDraft {
	const key =
		partial?.clientKey
		?? `${role.toLowerCase()}-${Math.random().toString(36).slice(2, 8)}`;
	return {
		clientKey: key,
		id: partial?.id,
		role,
		label: partial?.label ?? (role === 'PACK' ? 'Pack' : 'Piece'),
		sku: partial?.sku ?? '',
		uomId: partial?.uomId ?? '',
		price: partial?.price ?? '',
		qtyOnHand: partial?.qtyOnHand ?? '0',
		breakable: partial?.breakable ?? (role === 'PACK'),
		minUnbrokenQty: partial?.minUnbrokenQty ?? '0',
		breakPoolAboveQty: partial?.breakPoolAboveQty ?? '0',
		inheritQtyToChildren: partial?.inheritQtyToChildren ?? false,
	};
}
