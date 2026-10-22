export const glossaryTerms = [
	{
		id: 'pack',
		term: 'Pack',
		short: 'A larger sellable unit that can contain pieces or other packs.',
		long: 'A pack is how you sell something in bulk—for example a spool of wire or a carton of parts. A pack can link to a piece (or to another pack in a chain) so inventory and break fees stay consistent when someone buys less than a full pack.',
	},
	{
		id: 'piece',
		term: 'Piece',
		short: 'The smaller sellable unit—often cut or broken out of a pack.',
		long: 'A piece is the unit shoppers buy when they want less than a full pack—for example feet of cable cut from a spool. A product can be piece-only, or a piece can sit under one or more packs through pack links.',
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
		term: 'Pack / piece key',
		short: 'A stable name for a pack or piece inside a product, used when importing.',
		long: 'When a CSV adds or updates catalog rows, packs and pieces are matched by SKU plus offering_key (for example pack or piece). That lets you rename a SKU without losing the row, and it is how nested pack/piece links point at each other.',
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
