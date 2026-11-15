/**
 * Curated Place et Marque WIP / roadmap copy.
 *
 * Sourced from `development` git history, feature-branch titles, and recent
 * PeM / manage / catalog landings — human titles, not raw SHAs.
 *
 * Sync hook (later): `ops/tooling/roadmap-from-git.sh` can propose new
 * completed rows from `git log origin/development --pretty=format:%s` (and
 * merged branch names). Keep this file curated; do not auto-overwrite
 * titles or planned items without a human pass.
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
};

export type RoadmapPlannedItem = RoadmapItem & {
	status: 'planned' | 'known-issue';
};

export const ROADMAP_AREA_LABELS: Record<RoadmapArea, string> = {
	catalog: 'Catalog & search',
	manage: 'Seller manage',
	'seller-chrome': 'Seller chrome',
	auth: 'Account & auth',
	notifications: 'Notifications',
	'cart-checkout': 'Cart & checkout',
	orders: 'Orders',
	motion: 'Motion & polish',
	platform: 'Platform & tooling',
};

/** Known WIP / planned refine work (prefs + active PeM surfaces). */
export const ROADMAP_PLANNED: RoadmapPlannedItem[] = [
	{
		id: 'planned-notifications-inbox',
		title: 'Notifications inbox refine',
		summary:
			'First-pass inbox shipped; still tightening unread density, expand-in-place, and menu badge behavior.',
		area: 'notifications',
		status: 'planned',
		sourceHint: 'PEM-247 / prefs manage',
	},
	{
		id: 'planned-inplace-controls',
		title: 'Edit-in-place controls refine',
		summary:
			'Tiered in-place edit and deferred saves are live; controls, save bar, and toggle affordances still need a polish pass.',
		area: 'catalog',
		status: 'planned',
		sourceHint: 'PEM-245 / PEM-239',
	},
	{
		id: 'planned-account-page',
		title: 'Account page refine',
		summary:
			'Account hub and password subpage landed; buyer/seller density and navigation still open for refine.',
		area: 'auth',
		status: 'planned',
		sourceHint: 'PEM-246 / PEM-240',
	},
	{
		id: 'planned-manage-pane',
		title: 'Manage frost pane & pin groups',
		summary:
			'Seller bottom pane and Filter–Show pinning keep moving; empty-state harvest and pin L/C/R need a settled pass.',
		area: 'manage',
		status: 'known-issue',
		sourceHint: 'PEM-395 / PEM-427',
	},
	{
		id: 'planned-persona-pass',
		title: 'Persona pass on new surfaces',
		summary:
			'Fresh pages get a full persona pass before Austen looks; this roadmap page is next in that queue.',
		area: 'platform',
		status: 'planned',
	},
];

/**
 * Extensive completed list — curated from real history on `development`.
 * Prefer grouping by area on the page.
 */
export const ROADMAP_COMPLETED: RoadmapItem[] = [
	// Catalog & search
	{
		id: 'cat-ssr-category-bar',
		title: 'SSR-seed CatalogCategoryBar (no first-paint CLS)',
		area: 'catalog',
		sourceHint: 'PEM-370',
	},
	{
		id: 'cat-category-bar-typewriter',
		title: 'Category bar in-place second-line scroll / typewriter',
		area: 'catalog',
	},
	{
		id: 'cat-category-bar-fixed-row',
		title: 'Keep category bar to one fixed-height row; swap chips in place',
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
		title: '80vh catalog menus on desktop; mobile drawer',
		area: 'catalog',
		sourceHint: 'PEM-408',
	},
	{
		id: 'cat-navigate-chrome',
		title: 'Unify navigate chrome: prose vs controls vs back',
		area: 'catalog',
		sourceHint: 'PEM-368 / PEM-366',
	},
	{
		id: 'cat-drill-vs-navigate',
		title: 'Clarify drill chevrons vs navigate arrows sitewide',
		area: 'catalog',
		sourceHint: 'PEM-340',
	},
	{
		id: 'cat-breadcrumb',
		title: 'Shared MarketplaceBreadcrumb',
		area: 'catalog',
	},
	{
		id: 'cat-carousel-carets',
		title: 'Product-card carousel carets, dots, and hover fade',
		area: 'catalog',
	},
	{
		id: 'cat-search-inplace',
		title: 'Field-level in-place edits on search (replace Edit dialog)',
		area: 'catalog',
		sourceHint: 'PEM-227',
	},
	{
		id: 'cat-pdp-inplace',
		title: 'Shared in-place field edits on PDP with Full edit link',
		area: 'catalog',
		sourceHint: 'PEM-228',
	},
	{
		id: 'cat-inplace-toggle',
		title: 'In-place edit toggleable and off by default',
		area: 'catalog',
		sourceHint: 'PEM-239',
	},
	{
		id: 'cat-tiered-inplace',
		title: 'Tiered in-place edit and deferred saves',
		area: 'catalog',
		sourceHint: 'PEM-245',
	},
	{
		id: 'cat-pdp-cart',
		title: 'PDP buy box: in-cart qty spinner; stable height',
		area: 'catalog',
		sourceHint: 'PEM-372',
	},
	{
		id: 'cat-slug-redirect',
		title: 'Redirect product UUID URLs to human slug paths',
		area: 'catalog',
	},
	{
		id: 'cat-vendor-storefront',
		title: 'Buyer-facing vendor storefront pages by slug',
		area: 'catalog',
	},
	{
		id: 'cat-vendor-profile-edit',
		title: 'Editable seller fields on buyer vendor profile',
		area: 'catalog',
	},
	{
		id: 'cat-search-h1',
		title: 'Truncate long catalog search H1; skip to results',
		area: 'catalog',
	},
	{
		id: 'cat-asgreen',
		title: 'One selected-green language across search and drill-in',
		area: 'catalog',
	},
	{
		id: 'cat-guide',
		title: 'Plain-language Guide glossary for PeM terms',
		area: 'catalog',
	},
	{
		id: 'cat-cls-first-pass',
		title: 'First-pass CLS cuts on catalog chrome and images',
		area: 'catalog',
	},

	// Manage
	{
		id: 'mng-top-controls',
		title: 'Move manage list controls into the top bar',
		area: 'manage',
		sourceHint: 'PEM-395',
	},
	{
		id: 'mng-title-row',
		title: 'Manage title, Filter–Show, and page summary on one row',
		area: 'manage',
		sourceHint: 'PEM-437',
	},
	{
		id: 'mng-title-align',
		title: 'Middle-align manage title, Filter–Show, and page summary',
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
		title: 'Replace manage native selects with flipping frost menus',
		area: 'manage',
		sourceHint: 'PEM-431',
	},
	{
		id: 'mng-row-actions',
		title: 'Separate manage Edit / Delete; pencil on Edit',
		area: 'manage',
		sourceHint: 'PEM-397',
	},
	{
		id: 'mng-archive-split',
		title: 'Archive split control with permanent-delete menu',
		area: 'manage',
	},
	{
		id: 'mng-destructive-confirms',
		title: 'Destructive-action confirms with archive, delete, and undo',
		area: 'manage',
		sourceHint: 'PEM-411',
	},
	{
		id: 'mng-dock-pagination',
		title: 'Dock manage pagination inline at list end when scrolled',
		area: 'manage',
	},
	{
		id: 'mng-pin-groups',
		title: 'L/C/R pin groups for manage frost controls',
		area: 'manage',
	},
	{
		id: 'mng-filter-stock-sort',
		title: 'Manage frost filter, stock, and sort controls',
		area: 'manage',
	},
	{
		id: 'mng-new-product-cta',
		title: 'Stable New product CTA through hover arrow reveal',
		area: 'manage',
	},
	{
		id: 'mng-vendor-filter-chrome',
		title: 'Vendor picker in seller top bar with clear label',
		area: 'manage',
	},
	{
		id: 'mng-action-icons',
		title: 'View/Edit icons before labels on desktop manage rows',
		area: 'manage',
	},
	{
		id: 'mng-uom-attr-cat',
		title: 'First-pass refine seller UOM, attribute, and category pages',
		area: 'manage',
		sourceHint: 'PEM-231',
	},
	{
		id: 'mng-vendor-slugs',
		title: 'Human-readable vendor management URLs and link-name requests',
		area: 'manage',
	},
	{
		id: 'mng-vendor-members',
		title: 'Vendor member role controls and capability matrix',
		area: 'manage',
		sourceHint: 'PEM-89',
	},
	{
		id: 'mng-widget-prefs',
		title: 'Collapsible widget prefs ⋮ on the right of section headers',
		area: 'manage',
		sourceHint: 'PEM-446 / PEM-449',
	},

	// Seller chrome
	{
		id: 'sell-bottom-pane',
		title: 'Seller frosted bottom action pane (page actions only)',
		area: 'seller-chrome',
	},
	{
		id: 'sell-pane-full-width',
		title: 'Seller bottom pane full viewport width',
		area: 'seller-chrome',
		sourceHint: 'PEM-427',
	},
	{
		id: 'sell-empty-mount',
		title: 'Keep empty bottom bar mounted for harvest pin-in',
		area: 'seller-chrome',
	},
	{
		id: 'sell-mode-cues',
		title: 'Clear Selling vs shopping chrome cues',
		area: 'seller-chrome',
		sourceHint: 'PEM-339',
	},
	{
		id: 'sell-hide-cart',
		title: 'Hide cart on seller-facing routes',
		area: 'seller-chrome',
	},
	{
		id: 'sell-jumptotop',
		title: 'JumpToTop in right gutter; no overlap with pane',
		area: 'seller-chrome',
		sourceHint: 'PEM-434',
	},
	{
		id: 'sell-header-ssr',
		title: 'SSR-seed PeM header auth/role chrome before paint',
		area: 'seller-chrome',
		sourceHint: 'PEM-373',
	},
	{
		id: 'sell-header-spacer',
		title: 'SSR-match PeM header spacer to category bar',
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
		title: 'Refine header account menu density for buyer and seller',
		area: 'seller-chrome',
	},

	// Auth
	{
		id: 'auth-account-hub',
		title: 'Account hub with password subpage',
		area: 'auth',
		sourceHint: 'PEM-246',
	},
	{
		id: 'auth-account-first-pass',
		title: 'First-pass refine auth account page',
		area: 'auth',
		sourceHint: 'PEM-240',
	},
	{
		id: 'auth-session-aware',
		title: 'Session-aware Sign in language and gates',
		area: 'auth',
		sourceHint: 'PEM-237',
	},
	{
		id: 'auth-join-demo',
		title: 'Join-demo seller path via real invites',
		area: 'auth',
	},
	{
		id: 'auth-demo-join-harden',
		title: 'Harden link-name approve TOCTOU and demo-join token',
		area: 'auth',
	},

	// Notifications
	{
		id: 'notif-inbox-first-pass',
		title: 'Notifications inbox first-pass quality bar',
		area: 'notifications',
	},
	{
		id: 'notif-expand-inplace',
		title: 'Expand notification body in place on select',
		area: 'notifications',
		sourceHint: 'PEM-247',
	},
	{
		id: 'notif-badge',
		title: 'Unread menu badge, inbox page, and panel polish',
		area: 'notifications',
	},
	{
		id: 'notif-seller-chrome',
		title: 'In-app notifications wired with seller chrome cues',
		area: 'notifications',
	},

	// Cart & checkout
	{
		id: 'cart-checkout-first-pass',
		title: 'Cart and checkout first-pass UX',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-payment-step',
		title: 'Demo checkout payment step (no longer skips pay)',
		area: 'cart-checkout',
		sourceHint: 'PEM-338',
	},
	{
		id: 'checkout-payment-harden',
		title: 'Harden demo checkout payment after adversary reject',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-money-guards',
		title: 'Money-path re-entry guards and Cancelled filter fixes',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-inventory-cas',
		title: 'Inventory claim CAS, oversell reject, and trim floor',
		area: 'cart-checkout',
	},
	{
		id: 'checkout-refund-order',
		title: 'Refund clawback order: Stripe refund before transfer reverse',
		area: 'cart-checkout',
	},

	// Orders
	{
		id: 'orders-first-pass',
		title: 'First-pass seller and buyer orders UX',
		area: 'orders',
		sourceHint: 'PEM-87/88',
	},
	{
		id: 'orders-mode-cues',
		title: 'Distinguish seller fulfill orders from purchase history',
		area: 'orders',
		sourceHint: 'PEM-339',
	},
	{
		id: 'orders-buyer-chrome',
		title: 'Keep buyer orders on shopping chrome',
		area: 'orders',
	},
	{
		id: 'orders-filters',
		title: 'Pin vendor-order Filter/Status into the top context bar',
		area: 'orders',
		sourceHint: 'PEM-445',
	},
	{
		id: 'orders-human-status',
		title: 'Human buyer order status labels instead of raw enums',
		area: 'orders',
	},
	{
		id: 'orders-footer-cls',
		title: 'Reserve orders list space to stop footer CLS',
		area: 'orders',
	},

	// Motion & polish
	{
		id: 'motion-hero-cta',
		title: 'Match PeM CTAs to hero lift and featured-build arrow nudge',
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
		title: 'Hover-in navigate arrow on Shop by seller and contextual rows',
		area: 'motion',
		sourceHint: 'PEM-376',
	},
	{
		id: 'motion-footer-hover',
		title: 'NavigateHoverArrow on MarketplaceFooter nav',
		area: 'motion',
		sourceHint: 'PEM-385',
	},
	{
		id: 'motion-hover-desktop-lg',
		title: 'Gate hover-reveal chrome at lg, not md',
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
		title: 'Cap footer nav -mx to micromobile gutter',
		area: 'motion',
		sourceHint: 'PEM-400',
	},
	{
		id: 'motion-dust-banner',
		title: 'Pardon-our-dust maintenance banner stack',
		area: 'motion',
	},

	// Platform
	{
		id: 'plat-crm-first-pass',
		title: 'CRM portal first-pass quality bar (separate host)',
		area: 'platform',
	},
	{
		id: 'plat-dssh-launch',
		title: 'dssh launch for local Place et Marque stack',
		area: 'platform',
	},
	{
		id: 'plat-agent-cli',
		title: 'bin/agent-cli for one-command agent orientation',
		area: 'platform',
	},
	{
		id: 'plat-prefs-lint',
		title: 'Fail-closed prefs lint + portfolio-prefs ESLint plugin',
		area: 'platform',
	},
	{
		id: 'plat-graphify',
		title: 'Local Graphify knowledge-graph wiring for agents',
		area: 'platform',
	},
	{
		id: 'plat-cdn-extract',
		title: 'Extract Go image CDN into its own public repo',
		area: 'platform',
	},
	{
		id: 'plat-tab-titles',
		title: 'Descriptive Place et Marque browser tab titles',
		area: 'platform',
	},
	{
		id: 'plat-backend-down',
		title: 'Backend-down banner stacked with dust banner',
		area: 'platform',
	},
];

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
