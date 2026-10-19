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
		href: '/shop/vendors',
	},
	{
		id: 'uom-management',
		title: 'Units of measure',
		summary: 'Expandable UOMs with dimensions and conversion factors—feet, spools, packs, and more.',
		href: '/shop/uoms',
	},
	{
		id: 'category-management',
		title: 'Category taxonomy',
		summary: 'Slug-based categories for browse and search, with optional parents.',
		href: '/shop/categories',
	},
	{
		id: 'product-create',
		title: 'Standard product listing',
		summary: 'Create single-unit or pack/piece offerings with shared inventory.',
		href: '/shop/products/new',
	},
	{
		id: 'inventory-configuration',
		title: 'Inventory configuration',
		summary: 'Nested pack chains, break floors and ceilings, qty inheritance, and break fees.',
		href: '/shop/products/configure',
	},
	{
		id: 'search-page',
		title: 'Search and browse',
		summary: 'Catalog discovery with category and vendor filters.',
		href: '/shop/search',
	},
	{
		id: 'product-management',
		title: 'Catalog management',
		summary: 'Permissioned product lists with in-place quick-edit on pages you own.',
		href: '/shop/manage',
	},
	{
		id: 'checkout',
		title: 'Cart and checkout',
		summary: 'Buyer cart, Stripe checkout, and order management for vendors and shoppers.',
		href: '/shop/cart',
	},
];
