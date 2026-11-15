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
			'Inbox is live; we are still tightening unread counts, expanding a message in place, and the menu badge.',
		area: 'notifications',
		status: 'planned',
		sourceHint: 'PEM-247 / prefs manage',
	},
	{
		id: 'planned-inplace-controls',
		title: 'Smoother on-page editing',
		summary:
			'You can edit many fields without a separate dialog; the controls, save bar, and toggles still need polish.',
		area: 'catalog',
		status: 'planned',
		sourceHint: 'PEM-245 / PEM-239',
	},
	{
		id: 'planned-account-page',
		title: 'Clearer account pages',
		summary:
			'Account hub and password page landed; buyer vs seller density and navigation still need refine.',
		area: 'auth',
		status: 'planned',
		sourceHint: 'PEM-246 / PEM-240',
	},
	{
		id: 'planned-manage-pane',
		title: 'Seller tools bar still settling',
		summary:
			'The bottom seller tools and Filter–Show pinning keep moving; empty states and pin placement need a settled pass.',
		area: 'manage',
		status: 'known-issue',
		sourceHint: 'PEM-395 / PEM-427',
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
		title: 'Faster category bar on first paint',
		area: 'catalog',
		sourceHint: 'PEM-370',
		highlight: true,
	},
	{
		id: 'cat-category-bar-typewriter',
		title: 'Category bar second-line scroll and typewriter',
		area: 'catalog',
	},
	{
		id: 'cat-category-bar-fixed-row',
		title: 'Category bar stays one row while chips swap',
		area: 'catalog',
	},
	{
		id: 'cat-subcat-anim',
		title: 'Animate subcategory reveal; drop Featured card arrows',
		area: 'catalog',
	},
	{
		id: 'cat-category-hover',
		title: 'Hover animation on catalog category trigger',
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
		title: 'Clearer browse vs control vs back actions',
		area: 'catalog',
		sourceHint: 'PEM-368 / PEM-366',
	},
	{
		id: 'cat-drill-vs-navigate',
		title: 'Clearer drill-in vs go-forward arrows sitewide',
		area: 'catalog',
		sourceHint: 'PEM-340',
	},
	{
		id: 'cat-breadcrumb',
		title: 'Shared marketplace breadcrumb',
		area: 'catalog',
	},
	{
		id: 'cat-carousel-carets',
		title: 'Product-card carousel arrows, dots, and hover fade',
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
		title: 'On-page product edits with a Full edit link',
		area: 'catalog',
		sourceHint: 'PEM-228',
	},
	{
		id: 'cat-inplace-toggle',
		title: 'On-page edit optional and off by default',
		area: 'catalog',
		sourceHint: 'PEM-239',
	},
	{
		id: 'cat-tiered-inplace',
		title: 'Tiered on-page edit with deferred saves',
		area: 'catalog',
		sourceHint: 'PEM-245',
	},
	{
		id: 'cat-pdp-cart',
		title: 'Product page cart: quantity stepper with stable height',
		area: 'catalog',
		sourceHint: 'PEM-372',
		highlight: true,
	},
	{
		id: 'cat-slug-redirect',
		title: 'Product links use readable names, not opaque ids',
		area: 'catalog',
		highlight: true,
	},
	{
		id: 'cat-vendor-storefront',
		title: 'Buyer-facing shop pages by seller name',
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
		title: 'Truncate long search titles; skip straight to results',
		area: 'catalog',
	},
	{
		id: 'cat-asgreen',
		title: 'One selected-green language across search and drill-in',
		area: 'catalog',
	},
	{
		id: 'cat-guide',
		title: 'Plain-language Guide for Place et Marque terms',
		area: 'catalog',
	},
	{
		id: 'cat-cls-first-pass',
		title: 'Less layout jump on catalog chrome and images',
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
		title: 'Middle-align manage title, Filter–Show, and summary',
		area: 'manage',
		sourceHint: 'PEM-441',
	},
	{
		id: 'mng-page-summary',
		title: 'Pin manage page summary with Filter–Show in the top bar',
		area: 'manage',
		sourceHint: 'PEM-436',
	},
	{
		id: 'mng-cls-reserve',
		title: 'Reserve manage context bars before paint',
		area: 'manage',
		sourceHint: 'PEM-440',
	},
	{
		id: 'mng-frost-menus',
		title: 'Custom Filter / Stock / Sort menus instead of native selects',
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
		title: 'Pagination docks at the list end when you scroll',
		area: 'manage',
	},
	{
		id: 'mng-pin-groups',
		title: 'Left / center / right pin groups for manage controls',
		area: 'manage',
	},
	{
		id: 'mng-filter-stock-sort',
		title: 'Manage filter, stock, and sort controls',
		area: 'manage',
	},
	{
		id: 'mng-new-product-cta',
		title: 'Stable New product button through hover arrow reveal',
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
		title: 'Readable seller management URLs and link-name requests',
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
		title: 'Collapsible section prefs menu on the right of headers',
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
		title: 'Seller bottom bar spans the full viewport',
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
		title: 'Clear Selling vs shopping cues in the chrome',
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
		title: 'Sign-in and role chrome ready on first paint',
		area: 'seller-chrome',
		sourceHint: 'PEM-373',
	},
	{
		id: 'sell-header-spacer',
		title: 'Header spacer matches the category bar height',
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
		title: 'Sign-in language that knows if you are already signed in',
		area: 'auth',
		sourceHint: 'PEM-237',
	},
	{
		id: 'auth-join-demo',
		title: 'Join-demo seller path through real invites',
		area: 'auth',
	},
	{
		id: 'auth-demo-join-harden',
		title: 'Hardened demo-join and link-name approve flow',
		area: 'auth',
	},

	// Notifications
	{
		id: 'notif-inbox-first-pass',
		title: 'Notifications inbox first quality bar',
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
		title: 'In-app notifications with seller layout cues',
		area: 'notifications',
	},

	// Cart & checkout
	{
		id: 'cart-checkout-first-pass',
		title: 'Cart and checkout first quality bar',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-payment-step',
		title: 'Checkout payment step (no longer skips pay)',
		area: 'cart-checkout',
		sourceHint: 'PEM-338',
		highlight: true,
	},
	{
		id: 'checkout-payment-harden',
		title: 'Hardened demo checkout payment after reject testing',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-money-guards',
		title: 'Safer money-path re-entry and Cancelled filter fixes',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-inventory-cas',
		title: 'Inventory claim guards against overselling',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-refund-order',
		title: 'Refunds run in a safe order before reversing payouts',
		area: 'cart-checkout',
	},

	// Orders
	{
		id: 'orders-first-pass',
		title: 'Seller and buyer orders first quality bar',
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
		title: 'Buyer orders stay on shopping chrome',
		area: 'orders',
	},
	{
		id: 'orders-filters',
		title: 'Vendor-order Filter and Status in the top context bar',
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
		title: 'Reserved orders list space so the footer does not jump',
		area: 'orders',
	},

	// Motion & polish
	{
		id: 'motion-hero-cta',
		title: 'Buttons match hero lift and featured-build arrow nudge',
		area: 'motion',
		sourceHint: 'PEM-389',
	},
	{
		id: 'motion-persistent-arrow',
		title: 'Persistent navigate arrow nudge; featured Join row cleanup',
		area: 'motion',
		sourceHint: 'PEM-390',
	},
	{
		id: 'motion-hover-nav',
		title: 'Hover-in navigate arrow on Shop by seller and related rows',
		area: 'motion',
		sourceHint: 'PEM-376',
	},
	{
		id: 'motion-footer-hover',
		title: 'Navigate hover arrow on marketplace footer links',
		area: 'motion',
		sourceHint: 'PEM-385',
	},
	{
		id: 'motion-hover-desktop-lg',
		title: 'Hover-reveal chrome only on large screens',
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
		title: 'Admin portal first quality bar (separate host)',
		area: 'platform',
	},
	{
		id: 'plat-dssh-launch',
		title: 'One-command local Place et Marque stack launch',
		area: 'platform',
	},
	{
		id: 'plat-agent-cli',
		title: 'One-command orientation helper for agents',
		area: 'platform',
	},
	{
		id: 'plat-prefs-lint',
		title: 'Prefs lint that fails closed on style regressions',
		area: 'platform',
	},
	{
		id: 'plat-graphify',
		title: 'Local code knowledge graph for agents',
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
		title: 'API-down banner stacked with the dust banner',
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
