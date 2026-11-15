'use client';

import {
	Suspense,
	useDeferredValue,
	useEffect,
	useState,
	type ReactNode,
} from 'react';
import {
	listMyVendors,
	searchCatalogProducts,
	type CatalogProductSummary,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';
import { productCreateHref } from '../../../lib/vendor-ref';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import {
	PageBottomPanePortal,
	SellerTopContextPortal,
	useCatalogSearch,
} from '../../../components/catalog/CatalogSearchContext';
import { FrostSelectMenu } from '../../../components/catalog/FrostSelectMenu';
import { ManageProductRowActions } from '../../../components/catalog/ManageProductRowActions';
import { NavigateHoverArrow } from '../../../components/catalog/NavigateHoverArrow';
import { NavigatePersistentArrow } from '../../../components/catalog/NavigatePersistentArrow';
import { PILL_CTA_MOTION_CLASS } from '../../../components/catalog/pillCta';
import { PlusIcon } from '../../../components/icons/PlusIcon';

const PAGER_NAV_CLASS = `
	flex
	flex-wrap
	items-center
	justify-center
	gap-1
`;

const BOTTOM_ACTIONS_ROW_CLASS = `
	grid
	w-full
	grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
	items-center
	gap-x-2
	gap-y-2
`;

/** Match SellerTopContextPortal center column so on-page ↔ pinned stays put. */
const LIST_CONTROLS_ROW_CLASS = `
	grid
	w-full
	grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]
	items-end
	gap-x-3
	gap-y-2
`;

const LIST_CONTROLS_CLUSTER_CLASS = `
	flex
	min-w-0
	flex-wrap
	items-end
	justify-center
	gap-x-3
	gap-y-2
`;

/** Match catalog-search hard cap (`Math.min(..., 96)`); 100 never returns a full page. */
const PAGE_SIZE_OPTIONS = [24, 48, 96] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];
const DEFAULT_PAGE_SIZE: PageSize = 24;

const MANAGE_SORTS = [
	{ id: 'title', label: 'Name A–Z' },
	{ id: 'price-asc', label: 'Price: Low to High' },
	{ id: 'price-desc', label: 'Price: High to Low' },
] as const;
type ManageSort = (typeof MANAGE_SORTS)[number]['id'];
const DEFAULT_MANAGE_SORT: ManageSort = 'title';

const STOCK_FILTERS = [
	{ id: 'all', label: 'All stock' },
	{ id: 'in-stock', label: 'In stock' },
] as const;
type StockFilter = (typeof STOCK_FILTERS)[number]['id'];

const frostControlClassName = `
	rounded-full
	border
	border-slate-300
	bg-white
	px-2.5
	py-1.5
	text-sm
	font-semibold
	text-ink
`;

function formatPriceCents(cents: number | null): string {
	if(cents == null) {
		return '—';
	}
	return `$${(cents / 100).toFixed(2)}`;
}

function pageItems(current: number, total: number) {
	const wanted = new Set([1, total, current - 1, current, current + 1]);
	const pages = [...wanted].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b);
	const items: Array<number | 'gap'> = [];
	for(const page of pages) {
		const prior = items[items.length - 1];
		if(typeof prior === 'number' && page - prior > 1) {
			items.push('gap');
		}
		items.push(page);
	}
	return items;
}

function sortManageProducts(
	items: CatalogProductSummary[],
	sort: ManageSort,
) {
	const next = [...items];
	if(sort === 'price-asc') {
		next.sort(
			(left, right) =>
				(left.primaryPriceCents ?? 0) - (right.primaryPriceCents ?? 0),
		);
		return next;
	}
	if(sort === 'price-desc') {
		next.sort(
			(left, right) =>
				(right.primaryPriceCents ?? 0) - (left.primaryPriceCents ?? 0),
		);
		return next;
	}
	next.sort((left, right) => left.title.localeCompare(right.title));
	return next;
}

async function loadSellerProductPage(
	vendorRows: VendorSummary[],
	page: number,
	pageSize: PageSize,
	options: {
		q?: string;
		sort: ManageSort;
		inStock: boolean;
	},
): Promise<{ items: CatalogProductSummary[]; total: number; pageCount: number }> {
	if(vendorRows.length === 0) {
		return { items: [], total: 0, pageCount: 1 };
	}

	const offset = (page - 1) * pageSize;
	const results = await Promise.all(
		vendorRows.map((vendor) =>
			searchCatalogProducts({
				vendor: vendor.slug,
				limit: pageSize,
				offset,
				q: options.q,
				sort: options.sort,
				inStock: options.inStock || undefined,
			}).catch(() => ({ items: [] as CatalogProductSummary[], total: 0 })),
		),
	);
	const byId = new Map<string, CatalogProductSummary>();
	let total = 0;
	let pageCount = 1;
	for(const result of results) {
		const count = result.items.length;
		const vendorTotal = typeof result.total === 'number'
			? result.total
			: offset + count;
		total += vendorTotal;
		pageCount = Math.max(
			pageCount,
			Math.max(1, Math.ceil(vendorTotal / pageSize)),
		);
		for(const item of result.items) {
			byId.set(item.id, item);
		}
	}
	return {
		items: sortManageProducts([...byId.values()], options.sort),
		total,
		pageCount,
	};
}

function PagerButton({
	active = false,
	ariaCurrent,
	ariaLabel,
	children,
	disabled = false,
	onClick,
}: {
	active?: boolean;
	ariaCurrent?: 'page';
	ariaLabel?: string;
	children: ReactNode;
	disabled?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			className={
				active
					? `
						group
						inline-flex
						min-w-8
						items-center
						justify-center
						rounded-full
						bg-asgreen/15
						px-2.5
						py-1.5
						text-sm
						font-semibold
						text-asgreen
						focus-visible:outline
						focus-visible:outline-2
						focus-visible:outline-offset-2
						focus-visible:outline-asgreen
					`
					: `
						group
						inline-flex
						min-w-8
						items-center
						justify-center
						rounded-full
						border
						border-slate-300
						bg-white
						px-2.5
						py-1.5
						text-sm
						font-semibold
						text-ink
						hover:bg-asgreen/15
						hover:text-asgreen
						focus-visible:outline
						focus-visible:outline-2
						focus-visible:outline-offset-2
						focus-visible:outline-asgreen
						disabled:opacity-40
					`
			}
			aria-current={ariaCurrent}
			aria-label={ariaLabel}
			disabled={disabled}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	);
}

function ManagePagination({
	className,
	onPageChange,
	page,
	pageCount,
}: {
	className: string;
	onPageChange: (page: number) => void;
	page: number;
	pageCount: number;
}) {
	return (
		<nav
			aria-label="Pagination"
			className={className}
		>
			<PagerButton
				ariaLabel="Previous page"
				disabled={page <= 1}
				onClick={() => onPageChange(Math.max(1, page - 1))}
			>
				<NavigatePersistentArrow
					direction="left"
					iconClassName="h-4 w-4"
				/>
			</PagerButton>
			{pageItems(page, pageCount).map((item, index) =>
				item === 'gap'
					? (
						<span
							className="px-1 text-slate-400"
							key={`gap-${index}`}
						>
							…
						</span>
					)
					: (
						<PagerButton
							active={item === page}
							ariaCurrent={item === page ? 'page' : undefined}
							key={item}
							onClick={() => onPageChange(item)}
						>
							{item}
						</PagerButton>
					))}
			<PagerButton
				ariaLabel="Next page"
				disabled={page >= pageCount}
				onClick={() => onPageChange(Math.min(pageCount, page + 1))}
			>
				<NavigatePersistentArrow
					iconClassName="h-4 w-4"
				/>
			</PagerButton>
		</nav>
	);
}

/** Read a CSS length var as px; missing/cleared/0 → 0 (never invent a stale inset). */
function cssVarPx(name: string): number {
	if(typeof document === 'undefined') {
		return 0;
	}
	const raw = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	const parsed = Number.parseFloat(raw);
	if(Number.isFinite(parsed) && parsed > 0) {
		return Math.ceil(parsed);
	}
	return 0;
}

function manageBottomPaneInsetPx(): number {
	return cssVarPx('--seller-bottom-pane-stack');
}

function manageTopChromeInsetPx(): number {
	const measured = cssVarPx('--catalog-header-h');
	if(measured > 0) {
		return measured;
	}
	return cssVarPx('--catalog-header-h-base');
}

function ManageListControls({
	filterText,
	onFilterTextChange,
	onPageSizeChange,
	onSortChange,
	onStockFilterChange,
	pageSize,
	sort,
	stockFilter,
}: {
	filterText: string;
	onFilterTextChange: (value: string) => void;
	onPageSizeChange: (value: PageSize) => void;
	onSortChange: (value: ManageSort) => void;
	onStockFilterChange: (value: StockFilter) => void;
	pageSize: PageSize;
	sort: ManageSort;
	stockFilter: StockFilter;
}) {
	return (
		<>
			<label
				className="
					inline-flex
					min-w-[9rem]
					max-w-[14rem]
					flex-none
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
				"
			>
				<span>
					Filter
				</span>
				<input
					aria-label="Filter products"
					className={frostControlClassName}
					onChange={(event) => onFilterTextChange(event.target.value)}
					placeholder="Name or SKU"
					type="search"
					value={filterText}
				/>
			</label>
			<div
				className="
					inline-flex
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
				"
			>
				<span>
					Stock
				</span>
				<FrostSelectMenu
					ariaLabel="Stock filter"
					onChange={onStockFilterChange}
					options={STOCK_FILTERS}
					value={stockFilter}
				/>
			</div>
			<div
				className="
					inline-flex
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
				"
			>
				<span>
					Sort
				</span>
				<FrostSelectMenu
					ariaLabel="Sort products"
					onChange={onSortChange}
					options={MANAGE_SORTS}
					value={sort}
				/>
			</div>
			<div
				className="
					inline-flex
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
				"
			>
				<span>
					Show
				</span>
				<FrostSelectMenu
					ariaLabel="Products per page"
					onChange={
						(next) => {
							onPageSizeChange(Number(next) as PageSize);
						}
					}
					options={PAGE_SIZE_OPTIONS.map((size) => ({
						id: String(size),
						label: `${size} per page`,
					}))}
					value={String(pageSize)}
				/>
			</div>
		</>
	);
}

function ManageNewProductLink({
	href,
	title,
}: {
	href: string;
	title: string;
}) {
	return (
		<a
			aria-label="New product"
			className={`
				group
				relative
				inline-flex
				h-10
				w-10
				shrink-0
				items-center
				justify-center
				rounded-full
				bg-asgreen
				text-sm
				font-semibold
				text-white
				${PILL_CTA_MOTION_CLASS}
				hover:bg-asgreen/90
				sm:w-auto
				sm:justify-center
				sm:pl-3.5
				sm:pr-8
			`}
			href={href}
			title={title}
		>
			<span
				className="
					inline-flex
					items-center
					gap-1.5
				"
			>
				<PlusIcon
					className="
						h-4
						w-4
						shrink-0
					"
				/>
				<span
					className="
						hidden
						whitespace-nowrap
						sm:inline
					"
				>
					New product
				</span>
			</span>
			{/*
				Arrow is out of flow + right pad reserves its slot so hover
				max-width/margin reveal cannot grow the CTA box (PEM-395).
			*/}
			<span
				aria-hidden
				className="
					pointer-events-none
					absolute
					right-2.5
					top-1/2
					hidden
					-translate-y-1/2
					sm:inline-flex
				"
			>
				<NavigateHoverArrow />
			</span>
		</a>
	);
}

function ManageBottomActionsRow({
	newProduct,
	pager,
}: {
	newProduct: ReactNode;
	pager: ReactNode;
}) {
	return (
		<div className={BOTTOM_ACTIONS_ROW_CLASS}>
			<div />
			<div
				className="
					flex
					min-w-0
					justify-center
				"
			>
				{pager}
			</div>
			<div
				className="
					flex
					min-w-0
					justify-end
				"
			>
				{newProduct}
			</div>
		</div>
	);
}

function PlaceEtMarqueManageContent() {
	const { user } = useSession();
	const { pageBottomPaneHostEl } = useCatalogSearch();
	const [products, setProducts] = useState<CatalogProductSummary[]>([]);
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState('');
	const [vendorsReady, setVendorsReady] = useState(false);
	const [loadingProducts, setLoadingProducts] = useState(false);
	const [page, setPage] = useState(1);
	const [pageSize, setPageSize] = useState<PageSize>(DEFAULT_PAGE_SIZE);
	const [pageCount, setPageCount] = useState(1);
	const [total, setTotal] = useState(0);
	const [filterText, setFilterText] = useState('');
	const deferredFilterText = useDeferredValue(filterText);
	const [sort, setSort] = useState<ManageSort>(DEFAULT_MANAGE_SORT);
	const [stockFilter, setStockFilter] = useState<StockFilter>('all');

	const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
	const newProductVendor = selectedVendor ?? vendors[0] ?? null;
	const newProductVendorName = newProductVendor?.name ?? null;
	const showPager = vendorsReady && !loadingProducts && pageCount > 1 && products.length > 0;
	const showListControls = vendorsReady && vendors.length > 0;
	const showBottomActions = showPager || Boolean(newProductVendor);
	const activeFilterQuery = deferredFilterText.trim();
	const [listControlsEl, setListControlsEl] = useState<HTMLDivElement | null>(null);
	const [listEndEl, setListEndEl] = useState<HTMLDivElement | null>(null);
	/** Filter–Show pinned into the top bar center once their on-page row scrolls away. */
	const [listControlsPinned, setListControlsPinned] = useState(false);
	/** Pagination + New product stay on-page at list end until this is false (scrolled away → bottom bar). */
	const [bottomActionsInline, setBottomActionsInline] = useState(true);

	useEffect(() => {
		if(!user) {
			setVendors([]);
			setSelectedVendorId('');
			setProducts([]);
			setVendorsReady(false);
			setPage(1);
			setPageCount(1);
			setTotal(0);
			return;
		}

		let cancelled = false;
		setVendorsReady(false);

		listMyVendors()
			.then((vendorRows) => {
				if(cancelled) {
					return;
				}
				setVendors(vendorRows);
				setSelectedVendorId((current) =>
					current && vendorRows.some((vendor) => vendor.id === current)
						? current
						: '',
				);
				setVendorsReady(true);
			})
			.catch(() => {
				if(cancelled) {
					return;
				}
				setVendors([]);
				setSelectedVendorId('');
				setProducts([]);
				setVendorsReady(true);
			});

		return () => {
			cancelled = true;
		};
	}, [user]);

	useEffect(() => {
		setPage(1);
	}, [
		selectedVendorId,
		vendorsReady,
		pageSize,
		activeFilterQuery,
		sort,
		stockFilter,
	]);

	useEffect(() => {
		if(!user || !vendorsReady) {
			return;
		}

		let cancelled = false;
		setLoadingProducts(true);

		const scope = selectedVendor
			? [selectedVendor]
			: vendors;

		loadSellerProductPage(scope, page, pageSize, {
			q: activeFilterQuery || undefined,
			sort,
			inStock: stockFilter === 'in-stock',
		})
			.then((result) => {
				if(!cancelled) {
					setProducts(result.items);
					setTotal(result.total);
					setPageCount(result.pageCount);
				}
			})
			.catch(() => {
				if(!cancelled) {
					setProducts([]);
					setTotal(0);
					setPageCount(1);
				}
			})
			.finally(() => {
				if(!cancelled) {
					setLoadingProducts(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		user,
		vendorsReady,
		vendors,
		selectedVendor,
		page,
		pageSize,
		activeFilterQuery,
		sort,
		stockFilter,
	]);

	useEffect(() => {
		if(!showListControls || !listControlsEl) {
			setListControlsPinned(false);
			return;
		}

		let observer: IntersectionObserver | null = null;
		let raf = 0;
		const connect = () => {
			observer?.disconnect();
			const topInset = manageTopChromeInsetPx();
			observer = new IntersectionObserver(
				([entry]) => {
					setListControlsPinned(!entry?.isIntersecting);
				},
				{
					root: null,
					rootMargin: `-${topInset}px 0px 0px 0px`,
					threshold: 0,
				},
			);
			observer.observe(listControlsEl);
		};
		const scheduleConnect = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(connect);
		};

		scheduleConnect();
		window.addEventListener('resize', scheduleConnect);
		const styleWatcher = new MutationObserver(scheduleConnect);
		styleWatcher.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['style'],
		});
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', scheduleConnect);
			styleWatcher.disconnect();
			observer?.disconnect();
		};
	}, [
		showListControls,
		listControlsEl,
		products.length,
		page,
		pageSize,
	]);

	useEffect(() => {
		if(!showBottomActions || !listEndEl) {
			setBottomActionsInline(true);
			return;
		}

		let observer: IntersectionObserver | null = null;
		let raf = 0;
		const connect = () => {
			observer?.disconnect();
			// Hidden/cleared stack publishes 0px — use that, never a stale fallback.
			const bottomInset = manageBottomPaneInsetPx();
			observer = new IntersectionObserver(
				([entry]) => {
					setBottomActionsInline(Boolean(entry?.isIntersecting));
				},
				{
					root: null,
					rootMargin: `0px 0px -${bottomInset}px 0px`,
					threshold: 0,
				},
			);
			observer.observe(listEndEl);
		};
		const scheduleConnect = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(connect);
		};

		scheduleConnect();
		window.addEventListener('resize', scheduleConnect);
		const styleWatcher = new MutationObserver(scheduleConnect);
		styleWatcher.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['style'],
		});
		let paneWatcher: MutationObserver | null = null;
		let paneResize: ResizeObserver | null = null;
		if(pageBottomPaneHostEl) {
			paneWatcher = new MutationObserver(scheduleConnect);
			paneWatcher.observe(pageBottomPaneHostEl, {
				attributes: true,
				attributeFilter: ['data-hidden', 'style', 'class'],
			});
			paneResize = new ResizeObserver(scheduleConnect);
			paneResize.observe(pageBottomPaneHostEl);
		}
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', scheduleConnect);
			styleWatcher.disconnect();
			paneWatcher?.disconnect();
			paneResize?.disconnect();
			observer?.disconnect();
		};
	}, [
		showBottomActions,
		listEndEl,
		pageBottomPaneHostEl,
		products.length,
		page,
		pageSize,
	]);

	let vendorTopLeft: ReactNode = null;
	if(vendorsReady && vendors.length > 0) {
		vendorTopLeft = (
			<div
				className="
					flex
					min-w-[12rem]
					max-w-full
					flex-1
					flex-col
					gap-0.5
					text-[11px]
					font-medium
					text-slate-500
					sm:max-w-sm
					sm:flex-none
				"
			>
				<span className="leading-tight">
					Show products for vendor:
				</span>
				<FrostSelectMenu
					ariaLabel="Show products for vendor"
					fullWidth
					minWidth={192}
					onChange={setSelectedVendorId}
					options={[
						{
							id: '',
							label: 'All vendors',
						},
						...vendors.map((vendor) => ({
							id: vendor.id,
							label: vendor.name,
						})),
					]}
					preferredWidth={288}
					value={selectedVendorId}
				/>
			</div>
		);
	}
	else if(vendorsReady && vendors.length === 0) {
		vendorTopLeft = (
			<p
				className="
					text-xs
					text-slate-500
				"
			>
				No vendor memberships yet.
			</p>
		);
	}

	const listControls = showListControls
		? (
			<ManageListControls
				filterText={filterText}
				onFilterTextChange={setFilterText}
				onPageSizeChange={setPageSize}
				onSortChange={setSort}
				onStockFilterChange={setStockFilter}
				pageSize={pageSize}
				sort={sort}
				stockFilter={stockFilter}
			/>
		)
		: null;

	const newProductLink = newProductVendor
		? (
			<ManageNewProductLink
				href={productCreateHref({ vendor: newProductVendor })}
				title={
					selectedVendor
						? 'New product'
						: `Creates under ${newProductVendorName}`
				}
			/>
		)
		: null;

	const pagerNav = showPager
		? (
			<ManagePagination
				className={PAGER_NAV_CLASS}
				onPageChange={setPage}
				page={page}
				pageCount={pageCount}
			/>
		)
		: null;

	/** Right-aligned shrink-wrap count; pins with Filter–Show (Your products stays on-page). */
	const pageSummary = vendorsReady && !loadingProducts && total > 0
		? (
			<p
				className="
					w-fit
					shrink-0
					text-right
					text-xs
					text-slate-500
				"
			>
				{selectedVendor
					? `Showing ${((page - 1) * pageSize + 1).toLocaleString()}–${Math.min(page * pageSize, total).toLocaleString()} of ${total.toLocaleString()}`
					: `Page ${page} of ${pageCount} · ${total.toLocaleString()} product${total === 1 ? '' : 's'} across your vendors`
				}
			</p>
		)
		: null;

	return (
		<div
			className="
				flex
				flex-col
				gap-6
				pb-[max(4rem,var(--seller-bottom-pane-stack,0px))]
			"
		>
			<SellerTopContextPortal
				center={listControlsPinned ? listControls : null}
				left={vendorTopLeft}
				right={listControlsPinned ? pageSummary : null}
			/>

			<PageBottomPanePortal
				center={
					!bottomActionsInline
						? pagerNav
						: null
				}
				reserveEmpty
				right={
					!bottomActionsInline
						? newProductLink
						: null
				}
			/>

			<div>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Product management
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Inventory for vendors you can edit.
				</p>
				{user
					? (
						<p
							className="
								mt-3
								text-sm
								text-slate-600
							"
						>
							Signed in as {user.email}
						</p>
					)
					: null
				}
			</div>

			{showListControls
				? (
					<div
						className={
							listControlsPinned
								? `
									h-[4.5rem]
									shrink-0
								`
								: LIST_CONTROLS_ROW_CLASS
						}
						ref={setListControlsEl}
					>
						{listControlsPinned
							? null
							: (
								<>
									<div />
									<div className={LIST_CONTROLS_CLUSTER_CLASS}>
										{listControls}
									</div>
									<div />
								</>
							)
						}
					</div>
				)
				: null
			}

			<section
				className="
					flex
					min-w-0
					flex-col
					gap-3
				"
			>
				<div
					className="
						flex
						min-w-0
						flex-wrap
						items-baseline
						justify-between
						gap-x-3
						gap-y-1
					"
				>
					<h2 className="text-lg font-semibold">
						Your products
					</h2>
					{listControlsPinned
						? null
						: pageSummary
					}
				</div>
				{!vendorsReady || loadingProducts
					? (
						<p className="text-sm text-slate-500">
							Loading your inventory…
						</p>
					)
					: null
				}
				{vendorsReady && !loadingProducts && products.length === 0
					? (
						<p className="text-sm text-slate-500">
							{vendors.length === 0
								? 'Create a vendor organization to start listing products.'
								: activeFilterQuery || stockFilter === 'in-stock'
									? 'No products match these filters.'
									: selectedVendor
										? 'No products yet for this vendor.'
										: 'No products yet for your vendors.'
							}
						</p>
					)
					: null
				}
				{vendorsReady && !loadingProducts
					? products.map((product) => (
						<div
							className="
								flex
								flex-col
								gap-2
								rounded-xl
								border
								border-slate-200
								bg-white
								p-4
								sm:flex-row
								sm:items-center
								sm:justify-between
							"
							key={product.id}
						>
							<div className="min-w-0">
								<p
									className="
										text-xs
										font-semibold
										uppercase
										tracking-wide
										text-slate-500
									"
								>
									{product.vendor.name}
								</p>
								<p className="mt-1 font-semibold">
									{product.title}
								</p>
								<p className="mt-1 text-sm text-slate-600">
									{formatPriceCents(product.primaryPriceCents)}
									{product.primaryUom
										? ` / ${product.primaryUom}`
										: ''
									}
									{' · '}
									{product.availableQty} available
								</p>
							</div>
							<ManageProductRowActions
								onDeleted={
									(productId) => {
										setProducts((current) =>
											current.filter((row) => row.id !== productId),
										);
										setTotal((current) => Math.max(0, current - 1));
									}
								}
								onRestored={
									(restored) => {
										setProducts((current) =>
											current.map((row) =>
												row.id === product.id
													? {
														...row,
														...restored,
														id: restored.id,
													}
													: row
											),
										);
									}
								}
								product={product}
							/>
						</div>
					))
					: null
				}
				{showBottomActions
					? (
						<>
							<div
								aria-hidden
								className="
									h-px
									w-full
									shrink-0
								"
								ref={setListEndEl}
							/>
							{bottomActionsInline
								? (
									<ManageBottomActionsRow
										newProduct={newProductLink}
										pager={pagerNav}
									/>
								)
								: null
							}
						</>
					)
					: null
				}
			</section>
		</div>
	);
}

export default function PlaceEtMarqueManagePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess
				vendorRequired
				reasonKey="manage"
			>
				<PlaceEtMarqueManageContent />
			</RequireAccess>
		</Suspense>
	);
}
