export type ShowcasePortal = {
	id: string;
	title: string;
	summary: string;
	href: string;
};

export const showcasePortals: ShowcasePortal[] = [
	{
		id: 'vendor-page',
		title: 'Vendor organizations',
		summary: 'Multi-vendor stores with OWNER membership and permissioned catalog edits.',
		href: '/place-et-marque/vendors',
	},
	{
		id: 'uom-management',
		title: 'Units of measure',
		summary: 'Expandable UOMs with dimensions and conversion factors—feet, spools, packs, and more.',
		href: '/place-et-marque/uoms',
	},
	{
		id: 'category-management',
		title: 'Category taxonomy',
		summary: 'Slug-based categories for browse and search, with optional parents.',
		href: '/place-et-marque/categories',
	},
	{
		id: 'product-create',
		title: 'Standard product listing',
		summary: 'Create a piece listing; add packs, pack chains, and variants when needed.',
		href: '/place-et-marque/products/new',
	},
	{
		id: 'inventory-configuration',
		title: 'Advanced product',
		summary: 'Pack chains, break floors and ceilings, qty inheritance, break fees, and variants.',
		href: '/place-et-marque/products/configure',
	},
	{
		id: 'search-page',
		title: 'Search and browse',
		summary: 'Catalog discovery with category and vendor filters.',
		href: '/place-et-marque/search',
	},
	{
		id: 'product-management',
		title: 'Catalog management',
		summary: 'Permissioned product lists with in-place quick-edit on pages you own.',
		href: '/place-et-marque/manage',
	},
	{
		id: 'checkout',
		title: 'Cart and checkout',
		summary: 'Buyer cart, Stripe checkout, and order management for vendors and shoppers.',
		href: '/place-et-marque/cart',
	},
];
