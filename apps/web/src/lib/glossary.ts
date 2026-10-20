export const glossaryTerms = [
	{
		id: 'offering',
		term: 'Offering',
		short: 'One buyable size or form of a product.',
		long: 'A product is the listing shoppers see. An offering is each way that listing can be sold—for example a spool and a per-foot cut of the same cable. Each offering has its own SKU, unit, price, and inventory.',
	},
	{
		id: 'uom',
		term: 'UOM',
		short: 'Unit of measure—how quantity is counted.',
		long: 'UOM is short for unit of measure: foot, spool, each, and so on. Place et Marque has shared global units plus units a vendor defines for their own catalog. Aliases (ft, foot, \') count as the same name when looking for duplicates.',
	},
	{
		id: 'broken-pack',
		term: 'Broken pack',
		short: 'The remainder after a pack is opened to sell a smaller amount.',
		long: 'If a 500-foot spool is opened to sell 20 feet, the leftover 480 feet is a broken pack. Piece availability can be derived from whole packs plus these remainders instead of tracking a separate piece pile.',
	},
	{
		id: 'break-fee',
		term: 'Break fee',
		short: 'An extra charge for opening a pack to sell a smaller amount.',
		long: 'A break fee is optional. It covers the cost of opening a pack (or a nested pack in a chain) so a shopper can buy less than a full unit. You can set a product default and override it on a specific pack-to-piece link.',
	},
	{
		id: 'supervendor',
		term: 'Supervendor',
		short: 'The one vendor allowed to edit shared catalog structure.',
		long: 'Exactly one vendor—currently austenstrine.dev—is the supervendor. That membership can create and change global categories and global units. Other vendors still tag products and can request new categories.',
	},
	{
		id: 'offering-key',
		term: 'Offering key',
		short: 'A stable name for an offering inside a product, used when importing.',
		long: 'When a CSV adds or updates catalog rows, offerings are matched by SKU plus offering_key (for example pack or piece). That lets you rename a SKU without losing the row, and it is how nested pack/piece links point at each other.',
	},
] as const;

export type GlossaryTermId = (typeof glossaryTerms)[number]['id'];

export function getGlossaryTerm(id: GlossaryTermId) {
	const term = glossaryTerms.find((row) => row.id === id);
	if(!term) {
		throw new Error(`Unknown glossary term: ${id}`);
	}

	return term;
}

export function glossaryHref(id: GlossaryTermId) {
	return `/place-et-marque/guide#${id}`;
}
