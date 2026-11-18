/**
 * Curated Place et Marque WIP / roadmap copy.
 *
 * Visitor-facing titles (outcomes, not shipping diary). Sourced from
 * `development` history and feature landings — keep curated; do not
 * auto-overwrite without a human pass.
 */

export type RoadmapArea =
	| 'catalog'
	| 'manage'
	| 'seller-chrome'
	| 'auth'
	| 'notifications'
	| 'cart-checkout'
	| 'orders'
	| 'motion'
	| 'platform';

export type RoadmapItem = {
	id: string;
	title: string;
	summary?: string;
	area: RoadmapArea;
	/** Optional ticket / branch hint for later sync — not shown by default. */
	sourceHint?: string;
	/** Short highlight list on the Completed section. */
	highlight?: boolean;
};

export type RoadmapPlannedItem = RoadmapItem & {
	status: 'planned' | 'known-issue';
};

export const ROADMAP_AREA_LABELS: Record<RoadmapArea, string> = {
	catalog: 'Catalog & search',
	manage: 'Seller manage',
	'seller-chrome': 'Seller layout',
	auth: 'Account & sign-in',
	notifications: 'Notifications',
	'cart-checkout': 'Cart & checkout',
	orders: 'Orders',
	motion: 'Motion & polish',
	platform: 'Behind the scenes',
};

/** Known WIP / planned refine work — plain language for visitors. */
export const ROADMAP_PLANNED: RoadmapPlannedItem[] = [
	{
		id: 'planned-notifications-inbox',
		title: 'Clearer notifications inbox',
		summary:
			'The inbox works today; we are still polishing unread counts, opening a message in place, and the badge in the menu.',
		area: 'notifications',
		status: 'planned',
		sourceHint: 'PEM-247 / prefs manage',
	},
	{
		id: 'planned-inplace-controls',
		title: 'Smoother on-page editing',
		summary:
			'You can change many fields without a separate dialog; the controls, save bar, and toggles still need polish.',
		area: 'catalog',
		status: 'planned',
		sourceHint: 'PEM-245 / PEM-239',
	},
	{
		id: 'planned-account-page',
		title: 'Clearer account pages',
		summary:
			'The account hub and password page are live; buyer vs seller layout and navigation still need polish.',
		area: 'auth',
		status: 'planned',
		sourceHint: 'PEM-246 / PEM-240',
	},
	{
		id: 'planned-persona-pass',
		title: 'Visitor walkthrough on new pages',
		summary:
			'New pages get a full visitor walkthrough before we call them done; this roadmap page is in that queue.',
		area: 'platform',
		status: 'planned',
	},
];

/**
 * Extensive completed list — curated from real history on `development`.
 * Prefer grouping by area on the page; keep titles outcome-oriented.
 */
export const ROADMAP_COMPLETED: RoadmapItem[] = [
	// Catalog & search
	{
		id: 'cat-ssr-category-bar',
		title: 'Category bar ready as soon as the page opens',
		area: 'catalog',
		sourceHint: 'PEM-370',
		highlight: true,
	},
	{
		id: 'cat-category-bar-typewriter',
		title: 'Category bar scrolls the second line of topics smoothly',
		area: 'catalog',
	},
	{
		id: 'cat-category-bar-fixed-row',
		title: 'Category bar stays one row while topics swap',
		area: 'catalog',
	},
	{
		id: 'cat-subcat-anim',
		title: 'Subcategories ease in; Featured cards no longer show extra arrows',
		area: 'catalog',
	},
	{
		id: 'cat-category-hover',
		title: 'Gentle hover motion on the category button',
		area: 'catalog',
		sourceHint: 'PEM-409',
	},
	{
		id: 'cat-menus-drawer',
		title: 'Taller catalog menus on desktop; drawer on phones',
		area: 'catalog',
		sourceHint: 'PEM-408',
	},
	{
		id: 'cat-navigate-chrome',
		title: 'Clearer browse, control, and back actions',
		area: 'catalog',
		sourceHint: 'PEM-368 / PEM-366',
	},
	{
		id: 'cat-drill-vs-navigate',
		title: 'Clearer “open folder” vs “go to page” arrows across the site',
		area: 'catalog',
		sourceHint: 'PEM-340',
	},
	{
		id: 'cat-breadcrumb',
		title: 'Shared marketplace breadcrumb trail',
		area: 'catalog',
	},
	{
		id: 'cat-carousel-carets',
		title: 'Product-card image arrows, dots, and hover fade',
		area: 'catalog',
	},
	{
		id: 'cat-search-inplace',
		title: 'Edit search fields on the page (no Edit dialog)',
		area: 'catalog',
		sourceHint: 'PEM-227',
	},
	{
		id: 'cat-pdp-inplace',
		title: 'Edit product details on the page, with a Full edit link',
		area: 'catalog',
		sourceHint: 'PEM-228',
	},
	{
		id: 'cat-inplace-toggle',
		title: 'On-page edit is optional and off by default',
		area: 'catalog',
		sourceHint: 'PEM-239',
	},
	{
		id: 'cat-tiered-inplace',
		title: 'On-page edits can wait to save until you are ready',
		area: 'catalog',
		sourceHint: 'PEM-245',
	},
	{
		id: 'cat-pdp-cart',
		title: 'Quantity buttons keep a steady height',
		area: 'catalog',
		sourceHint: 'PEM-372',
		highlight: true,
	},
	{
		id: 'cat-slug-redirect',
		title: 'Product links use readable names, not random codes',
		area: 'catalog',
		highlight: true,
	},
	{
		id: 'cat-vendor-storefront',
		title: 'Shop pages buyers see by seller name',
		area: 'catalog',
		highlight: true,
	},
	{
		id: 'cat-vendor-profile-edit',
		title: 'Editable seller fields on the public shop page',
		area: 'catalog',
	},
	{
		id: 'cat-search-h1',
		title: 'Long search titles shorten; skip straight to results',
		area: 'catalog',
	},
	{
		id: 'cat-asgreen',
		title: 'Same green highlight across search and category browsing',
		area: 'catalog',
	},
	{
		id: 'cat-guide',
		title: 'Plain-language Guide for Place et Marque terms',
		area: 'catalog',
	},
	{
		id: 'cat-cls-first-pass',
		title: 'Less layout jump on category bars and product images',
		area: 'catalog',
	},

	// Manage
	{
		id: 'mng-top-controls',
		title: 'Seller list controls moved into the top bar',
		area: 'manage',
		sourceHint: 'PEM-395',
		highlight: true,
	},
	{
		id: 'mng-title-row',
		title: 'Manage title, Filter–Show, and summary on one row',
		area: 'manage',
		sourceHint: 'PEM-437',
	},
	{
		id: 'mng-title-align',
		title: 'Manage title, Filter–Show, and summary line up in the middle',
		area: 'manage',
		sourceHint: 'PEM-441',
	},
	{
		id: 'mng-page-summary',
		title: 'Manage page summary stays with Filter–Show in the top bar',
		area: 'manage',
		sourceHint: 'PEM-436',
	},
	{
		id: 'mng-cls-reserve',
		title: 'Manage top bars keep their space so the page does not jump',
		area: 'manage',
		sourceHint: 'PEM-440',
	},
	{
		id: 'mng-seller-tools-bar',
		title: 'Seller tools bar and Filter–Show stay put while you scroll',
		area: 'manage',
		sourceHint: 'PEM-504',
		highlight: true,
	},
	{
		id: 'mng-frost-menus',
		title: 'Custom Filter / Stock / Sort menus instead of plain dropdowns',
		area: 'manage',
		sourceHint: 'PEM-431',
	},
	{
		id: 'mng-row-actions',
		title: 'Separate Edit and Delete on manage rows; pencil on Edit',
		area: 'manage',
		sourceHint: 'PEM-397',
	},
	{
		id: 'mng-archive-split',
		title: 'Archive control with a permanent-delete menu',
		area: 'manage',
	},
	{
		id: 'mng-destructive-confirms',
		title: 'Confirms for archive and delete, with undo',
		area: 'manage',
		sourceHint: 'PEM-411',
		highlight: true,
	},
	{
		id: 'mng-dock-pagination',
		title: 'Page numbers stick at the list end when you scroll',
		area: 'manage',
	},
	{
		id: 'mng-pin-groups',
		title: 'Seller tools pin to the left, center, or right of the bar',
		area: 'manage',
	},
	{
		id: 'mng-filter-stock-sort',
		title: 'Manage filter, stock, and sort controls',
		area: 'manage',
	},
	{
		id: 'mng-new-product-cta',
		title: 'New product button stays steady when its arrow appears',
		area: 'manage',
	},
	{
		id: 'mng-vendor-filter-chrome',
		title: 'Shop picker in the seller top bar with a clear label',
		area: 'manage',
	},
	{
		id: 'mng-action-icons',
		title: 'View and Edit icons before labels on desktop manage rows',
		area: 'manage',
	},
	{
		id: 'mng-uom-attr-cat',
		title: 'Clearer seller units, attributes, and category pages',
		area: 'manage',
		sourceHint: 'PEM-231',
	},
	{
		id: 'mng-vendor-slugs',
		title: 'Readable seller management URLs and shop web-address requests',
		area: 'manage',
	},
	{
		id: 'mng-vendor-members',
		title: 'Seller member roles and permissions',
		area: 'manage',
		sourceHint: 'PEM-89',
	},
	{
		id: 'mng-widget-prefs',
		title: 'Collapse-section menu sits on the right of headers',
		area: 'manage',
		sourceHint: 'PEM-446 / PEM-449',
	},

	// Seller layout
	{
		id: 'sell-bottom-pane',
		title: 'Seller bottom action bar for page actions',
		area: 'seller-chrome',
		highlight: true,
	},
	{
		id: 'sell-pane-full-width',
		title: 'Seller bottom bar spans the full window width',
		area: 'seller-chrome',
		sourceHint: 'PEM-427',
	},
	{
		id: 'sell-empty-mount',
		title: 'Empty bottom bar stays ready for pinned actions',
		area: 'seller-chrome',
	},
	{
		id: 'sell-mode-cues',
		title: 'Clear Selling vs shopping cues in the header and menus',
		area: 'seller-chrome',
		sourceHint: 'PEM-339',
		highlight: true,
	},
	{
		id: 'sell-hide-cart',
		title: 'Hide cart on seller-facing pages',
		area: 'seller-chrome',
	},
	{
		id: 'sell-jumptotop',
		title: 'Jump to top in the right gutter; no overlap with the bar',
		area: 'seller-chrome',
		sourceHint: 'PEM-434',
	},
	{
		id: 'sell-header-ssr',
		title: 'Sign-in and role controls ready when the page opens',
		area: 'seller-chrome',
		sourceHint: 'PEM-373',
	},
	{
		id: 'sell-header-spacer',
		title: 'Header spacing matches the category bar height',
		area: 'seller-chrome',
		sourceHint: 'PEM-377',
	},
	{
		id: 'sell-right-align',
		title: 'Right-align actions in toolbars, footers, and forms',
		area: 'seller-chrome',
		sourceHint: 'PEM-234',
	},
	{
		id: 'sell-account-menu',
		title: 'Tighter header account menu for buyers and sellers',
		area: 'seller-chrome',
	},

	// Auth
	{
		id: 'auth-2fa-session-adopt',
		title: 'Stay signed in after the email sign-in code',
		area: 'auth',
		sourceHint: 'PEM-505',
		highlight: true,
	},
	{
		id: 'auth-account-hub',
		title: 'Account hub with a password subpage',
		area: 'auth',
		sourceHint: 'PEM-246',
	},
	{
		id: 'auth-account-first-pass',
		title: 'First polish pass on the account page',
		area: 'auth',
		sourceHint: 'PEM-240',
	},
	{
		id: 'auth-session-aware',
		title: 'Sign-in wording that knows if you are already signed in',
		area: 'auth',
		sourceHint: 'PEM-237',
	},
	{
		id: 'auth-join-demo',
		title: 'Join the demo as a seller through real invites',
		area: 'auth',
	},
	{
		id: 'auth-demo-join-harden',
		title: 'Safer joining the demo and approving a shop web address',
		area: 'auth',
	},

	// Notifications
	{
		id: 'notif-inbox-first-pass',
		title: 'Working notifications inbox (first usable version)',
		area: 'notifications',
	},
	{
		id: 'notif-expand-inplace',
		title: 'Expand a notification body when you select it',
		area: 'notifications',
		sourceHint: 'PEM-247',
	},
	{
		id: 'notif-badge',
		title: 'Unread menu badge, inbox page, and panel polish',
		area: 'notifications',
		highlight: true,
	},
	{
		id: 'notif-seller-chrome',
		title: 'In-app notifications that match seller page layout',
		area: 'notifications',
	},

	// Cart & checkout
	{
		id: 'cart-checkout-first-pass',
		title: 'Working cart and checkout (first usable version)',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-payment-step',
		title: 'Checkout includes a real payment step',
		area: 'cart-checkout',
		sourceHint: 'PEM-338',
		highlight: true,
	},
	{
		id: 'checkout-payment-harden',
		title: 'Safer demo checkout payment when a charge is declined',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-money-guards',
		title: 'Safer return to pay, plus Cancelled filter fixes',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-inventory-cas',
		title: 'Stock claims that guard against overselling',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-refund-order',
		title: 'Refunds finish in a safe order before reversing payouts',
		area: 'cart-checkout',
	},

	// Orders
	{
		id: 'orders-first-pass',
		title: 'Working seller and buyer orders (first usable version)',
		area: 'orders',
		sourceHint: 'PEM-87/88',
	},
	{
		id: 'orders-mode-cues',
		title: 'Clear seller fulfill orders vs purchase history',
		area: 'orders',
		sourceHint: 'PEM-339',
		highlight: true,
	},
	{
		id: 'orders-buyer-chrome',
		title: 'Buyer orders keep the shopping header and menus',
		area: 'orders',
	},
	{
		id: 'orders-filters',
		title: 'Seller-order Filter and Status in the top bar',
		area: 'orders',
		sourceHint: 'PEM-445',
	},
	{
		id: 'orders-human-status',
		title: 'Plain-language buyer order status labels',
		area: 'orders',
	},
	{
		id: 'orders-footer-cls',
		title: 'Orders list keeps space so the footer does not jump',
		area: 'orders',
	},

	// Motion & polish
	{
		id: 'motion-hero-cta',
		title: 'Buttons lift like the hero; Featured build arrows ease forward',
		area: 'motion',
		sourceHint: 'PEM-389',
	},
	{
		id: 'motion-persistent-arrow',
		title: 'Forward arrow keeps a gentle nudge; Featured Join row tidied',
		area: 'motion',
		sourceHint: 'PEM-390',
	},
	{
		id: 'motion-hover-nav',
		title: 'Hover forward arrow on Shop by seller and related rows',
		area: 'motion',
		sourceHint: 'PEM-376',
	},
	{
		id: 'motion-footer-hover',
		title: 'Forward hover arrow on marketplace footer links',
		area: 'motion',
		sourceHint: 'PEM-385',
	},
	{
		id: 'motion-hover-desktop-lg',
		title: 'Hover-only extra controls on large screens',
		area: 'motion',
	},
	{
		id: 'motion-external-link',
		title: 'External-link icon on recommendation LinkedIn links',
		area: 'motion',
		sourceHint: 'PEM-392',
	},
	{
		id: 'motion-footer-mx',
		title: 'Footer nav no longer overflows on very small phones',
		area: 'motion',
		sourceHint: 'PEM-400',
	},
	{
		id: 'motion-dust-banner',
		title: 'Pardon-our-dust maintenance banner',
		area: 'motion',
	},

	// Behind the scenes
	{
		id: 'plat-crm-first-pass',
		title: 'Working admin portal on its own host (first usable version)',
		area: 'platform',
	},
	{
		id: 'plat-dssh-launch',
		title: 'One-command local Place et Marque stack launch',
		area: 'platform',
	},
	{
		id: 'plat-agent-cli',
		title: 'One-command orientation helper for coding agents',
		area: 'platform',
	},
	{
		id: 'plat-prefs-lint',
		title: 'Style checks that catch layout regressions early',
		area: 'platform',
	},
	{
		id: 'plat-graphify',
		title: 'Local code map that helps coding agents find their way',
		area: 'platform',
	},
	{
		id: 'plat-cdn-extract',
		title: 'Image CDN split into its own public repo',
		area: 'platform',
	},
	{
		id: 'plat-tab-titles',
		title: 'Descriptive Place et Marque browser tab titles',
		area: 'platform',
	},
	{
		id: 'plat-backend-down',
		title: 'Server-down banner stacked with the dust banner',
		area: 'platform',
	},
];

export function completedHighlights(): RoadmapItem[] {
	return ROADMAP_COMPLETED.filter((item) => item.highlight);
}

export function completedByArea(): Array<{
	area: RoadmapArea;
	label: string;
	items: RoadmapItem[];
}> {
	const order: RoadmapArea[] = [
		'catalog',
		'manage',
		'seller-chrome',
		'auth',
		'notifications',
		'cart-checkout',
		'orders',
		'motion',
		'platform',
	];
	return order
		.map((area) => ({
			area,
			label: ROADMAP_AREA_LABELS[area],
			items: ROADMAP_COMPLETED.filter((item) => item.area === area),
		}))
		.filter((group) => group.items.length > 0);
}
