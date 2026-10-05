export type ShowcasePortal = {
	id: string;
	label: string;
	title: string;
	summary: string;
	href: string;
	cta: string;
	notes: string[];
};

export const showcasePortals: ShowcasePortal[] = [
	{
		id: 'guided-walkthrough',
		label: 'Start here',
		title: 'Empty-database walkthrough',
		summary:
			'Guided path: account → vendor (you become OWNER) → UOMs → category → pack/piece product → browse/search/quick-edit. No seed required.',
		href: '/shop/start',
		cta: 'Start walkthrough',
		notes: [
			'Works against an empty catalog',
			'Creates real rows as you go',
			'Ends on live storefront pages',
		],
	},
	{
		id: 'vendor-page',
		label: 'Multi-vendor',
		title: 'Vendor organizations',
		summary:
			'Create a vendor organization. The creator is linked as OWNER/admin for that organization.',
		href: '/shop/vendors',
		cta: 'Open vendors',
		notes: [
			'Any signed-in user can create a vendor',
			'OWNER membership unlocks product edits',
			'Members listed on the vendor detail page',
		],
	},
	{
		id: 'uom-management',
		label: 'Units',
		title: 'Units of measure',
		summary:
			'UOMs are expandable rows: feet, inches, spools, packs, boxes, and anything else you add.',
		href: '/shop/uoms',
		cta: 'Open UOMs',
		notes: [
			'No schema change to add units',
			'Dimension + conversion factor supported',
			'Required before product offerings',
		],
	},
	{
		id: 'category-management',
		label: 'Taxonomy',
		title: 'Category management',
		summary:
			'Create categories used by browse/search, then assign them when creating products.',
		href: '/shop/categories',
		cta: 'Open categories',
		notes: [
			'Optional parent categories',
			'Slug-based browse links',
			'Assigned on product create',
		],
	},
	{
		id: 'product-create',
		label: 'Catalog',
		title: 'Create pack/piece product',
		summary:
			'Create a product with two offerings (for example spool and foot) and link them as a pack/piece pair.',
		href: '/shop/products/new?walkthrough=1',
		cta: 'Create product',
		notes: [
			'One CatalogProduct, multiple ProductOfferings',
			'Pack quantity convertible to piece UOM',
			'Category assignment included',
		],
	},
	{
		id: 'search-page',
		label: 'Discovery',
		title: 'Search and browse',
		summary:
			'After you have products, use search and category filters the same way a shopper would.',
		href: '/shop/search',
		cta: 'Open search',
		notes: [
			'Works with whatever you created',
			'Category and vendor filters',
			'No demo SKU required',
		],
	},
	{
		id: 'product-management',
		label: 'Operations',
		title: 'Product management + quick-edit',
		summary:
			'Manage your vendor catalog. On product pages you own, quick-edit appears for in-place updates.',
		href: '/shop/manage',
		cta: 'Open management',
		notes: [
			'Permissioned by vendor membership',
			'Quick-edit on the product view page',
			'Links into live product URLs',
		],
	},
];
