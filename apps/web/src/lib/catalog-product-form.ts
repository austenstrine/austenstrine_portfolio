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

export type CatalogWorkspace = 'standard' | 'inventory';

export const CATALOG_WORKSPACE_LABELS: Record<
	CatalogWorkspace,
	{ title: string; short: string }
> = {
	standard: {
		title: 'Standard listing',
		short: 'Standard listing',
	},
	inventory: {
		title: 'Inventory configuration',
		short: 'Inventory config',
	},
};
