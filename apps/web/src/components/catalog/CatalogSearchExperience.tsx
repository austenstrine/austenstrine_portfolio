'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
	listCatalogCategories,
	searchCatalogProducts,
	type CatalogProductSummary,
	type CatalogSearchFilter,
	type CatalogSearchResult,
	type CatalogTermFacet,
} from '../../lib/catalog-api';
import { sortCategoryTree } from '../../lib/category-tree';
import { formatQty } from '../../lib/uom-qty';
import { CatalogCover } from './CatalogCover';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';

const PAGE_SIZE = 24;
const SORTS = [
	{ id: 'relevance', label: 'Featured' },
	{ id: 'price-asc', label: 'Price: Low to High' },
	{ id: 'price-desc', label: 'Price: High to Low' },
	{ id: 'title', label: 'Name: A to Z' },
] as const;

function useDebounced<T>(value: T, ms: number) {
	const [debounced, setDebounced] = useState(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), ms);
		return () => clearTimeout(timer);
	}, [value, ms]);
	return debounced;
}

function parseList(raw: string | null) {
	return (raw ?? '').split(',').map((row) => row.trim()).filter(Boolean);
}

function formatPrice(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

function titleCaseSlug(slug: string) {
	return slug
		.split(/[-_]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

function initials(name: string) {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if(parts.length === 0) {
		return 'PM';
	}
	if(parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase();
	}
	return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
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

export function CatalogSearchExperience() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const inputRef = useRef<HTMLInputElement>(null);

	const [query, setQuery] = useState(searchParams.get('q') ?? '');
	const [category, setCategory] = useState(searchParams.get('category') ?? '');
	const [vendor, setVendor] = useState(searchParams.get('vendor') ?? '');
	const [sort, setSort] = useState(searchParams.get('sort') ?? 'relevance');
	const [page, setPage] = useState(Math.max(Number(searchParams.get('page') ?? '1'), 1));
	const [inStock, setInStock] = useState(searchParams.get('inStock') === '1');
	const [omitValueIds, setOmitValueIds] = useState<string[]>(parseList(searchParams.get('omit')));
	const [manualValueIds, setManualValueIds] = useState<string[]>(parseList(searchParams.get('values')));
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [elevated, setElevated] = useState(false);
	const [expandedFacets, setExpandedFacets] = useState<string[]>([]);

	const [categories, setCategories] = useState<Array<{
		id: string;
		slug: string;
		name: string;
		parent?: { id: string; name: string; slug: string } | null;
	}>>([]);
	const categoryTree = sortCategoryTree(categories);

	const [results, setResults] = useState<CatalogProductSummary[]>([]);
	const [appliedFilters, setAppliedFilters] = useState<CatalogSearchFilter[]>([]);
	const [facets, setFacets] = useState<CatalogSearchResult['facets']>([]);
	const [categoryFacets, setCategoryFacets] = useState<CatalogTermFacet[]>([]);
	const [vendorFacets, setVendorFacets] = useState<CatalogTermFacet[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);

	const debouncedQuery = useDebounced(query, 220);

	useEffect(() => {
		listCatalogCategories()
			.then((rows) => setCategories(rows))
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const typing = event.target instanceof HTMLInputElement
				|| event.target instanceof HTMLTextAreaElement
				|| event.target instanceof HTMLSelectElement;
			if(event.key === '/' && !typing) {
				event.preventDefault();
				inputRef.current?.focus();
			}
			if(event.key === 'Escape') {
				if(filtersOpen) {
					setFiltersOpen(false);
					return;
				}
				if(document.activeElement === inputRef.current) {
					inputRef.current?.blur();
				}
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [filtersOpen]);

	useEffect(() => {
		const onScroll = () => setElevated(window.scrollY > 8);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	useEffect(() => {
		const params = new URLSearchParams();
		if(debouncedQuery.trim()) {
			params.set('q', debouncedQuery.trim());
		}
		if(category) {
			params.set('category', category);
		}
		if(vendor) {
			params.set('vendor', vendor);
		}
		if(sort !== 'relevance') {
			params.set('sort', sort);
		}
		if(page > 1) {
			params.set('page', String(page));
		}
		if(inStock) {
			params.set('inStock', '1');
		}
		if(manualValueIds.length) {
			params.set('values', manualValueIds.join(','));
		}
		if(omitValueIds.length) {
			params.set('omit', omitValueIds.join(','));
		}
		const next = params.toString();
		router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
	}, [
		debouncedQuery,
		category,
		vendor,
		sort,
		page,
		inStock,
		manualValueIds,
		omitValueIds,
		pathname,
		router,
	]);

	useEffect(() => {
		let active = true;
		setLoading(true);
		searchCatalogProducts({
			q: debouncedQuery.trim() || undefined,
			category: category || undefined,
			vendor: vendor || undefined,
			sort,
			inStock: inStock || undefined,
			limit: PAGE_SIZE,
			offset: (page - 1) * PAGE_SIZE,
			omitValueIds,
			rollupValueIds: manualValueIds,
		})
			.then((result) => {
				if(!active) {
					return;
				}
				setResults(result.items);
				setAppliedFilters(result.appliedFilters);
				setFacets(result.facets);
				setCategoryFacets(result.categoryFacets ?? []);
				setVendorFacets(result.vendorFacets ?? []);
				setTotal(result.total ?? result.items.length);
				setHasLoaded(true);
			})
			.catch(() => {
				if(!active) {
					return;
				}
				setResults([]);
				setAppliedFilters([]);
				setFacets([]);
				setCategoryFacets([]);
				setVendorFacets([]);
				setTotal(0);
				setHasLoaded(true);
			})
			.finally(() => {
				if(active) {
					setLoading(false);
				}
			});
		return () => {
			active = false;
		};
	}, [debouncedQuery, category, vendor, omitValueIds, manualValueIds, sort, page, inStock]);

	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const rangeEnd = Math.min(page * PAGE_SIZE, total);
	const selectedCategory = categories.find((row) => row.slug === category);
	const rolledDepartmentCounts = new Map<string, number>();
	for(const facet of categoryFacets) {
		let node = categories.find((row) => row.slug === facet.slug) ?? null;
		const seen = new Set<string>();
		while(node && !seen.has(node.id)) {
			seen.add(node.id);
			rolledDepartmentCounts.set(node.slug, (rolledDepartmentCounts.get(node.slug) ?? 0) + facet.count);
			node = node.parent
				? categories.find((row) => row.id === node!.parent!.id) ?? null
				: null;
		}
	}
	const withProducts = (rows: typeof categoryTree) =>
		rows.filter((row) => (rolledDepartmentCounts.get(row.slug) ?? 0) > 0);
	const departmentRows = selectedCategory
		? (() => {
			const children = withProducts(categoryTree.filter((row) => row.parent?.id === selectedCategory.id));
			if(children.length > 0) {
				return children;
			}
			return withProducts(categoryTree.filter((row) =>
				(row.parent?.id ?? null) === (selectedCategory.parent?.id ?? null)));
		})()
		: withProducts(categoryTree.filter((row) => row.depth === 0));
	const vendorLabel = vendor ? titleCaseSlug(vendor) : '';
	const activeFilterCount = [
		query.trim() ? 1 : 0,
		category ? 1 : 0,
		vendor ? 1 : 0,
		inStock ? 1 : 0,
		manualValueIds.length,
		omitValueIds.length,
	].reduce((sum, n) => sum + n, 0);

	const resetPage = () => setPage(1);

	const clearAll = () => {
		setQuery('');
		setCategory('');
		setVendor('');
		setInStock(false);
		setManualValueIds([]);
		setOmitValueIds([]);
		setSort('relevance');
		setPage(1);
	};

	const toggleValue = (valueId: string, checked: boolean) => {
		if(checked) {
			setManualValueIds((prev) => prev.filter((id) => id !== valueId));
			setOmitValueIds((prev) => (prev.includes(valueId) ? prev : [...prev, valueId]));
		}
		else {
			setManualValueIds((prev) => (prev.includes(valueId) ? prev : [...prev, valueId]));
			setOmitValueIds((prev) => prev.filter((id) => id !== valueId));
		}
		resetPage();
	};

	const facetRail = (
		<div className="flex flex-col gap-7">
			<section>
				<h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
					Availability
				</h2>
				<label className="mt-3 flex cursor-pointer items-center gap-3 text-[13px] text-ink">
					<input
						type="checkbox"
						checked={inStock}
						onChange={(event) => {
							setInStock(event.target.checked);
							resetPage();
						}}
						className="h-4 w-4 rounded border-slate-300 text-ink accent-ink"
					/>
					In stock
				</label>
			</section>

			<section>
				<h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
					Department
				</h2>
				<div className="mt-2 max-h-72 space-y-0.5 overflow-y-auto pr-1">
					<FacetRow
						label="All departments"
						active={!category}
						onClick={() => {
							setCategory('');
							resetPage();
						}}
					/>
					{selectedCategory?.parent
						? (
							<FacetRow
								icon={(
									<ArrowLeftIcon
										className="h-3.5 w-3.5 shrink-0"
									/>
								)}
								label={selectedCategory.parent.name}
								onClick={() => {
									setCategory(selectedCategory.parent!.slug);
									resetPage();
								}}
							/>
						)
						: null}
					{departmentRows.map((row) => (
						<FacetRow
							key={row.slug}
							label={row.name}
							count={rolledDepartmentCounts.get(row.slug)}
							active={category === row.slug}
							onClick={() => {
								setCategory(row.slug);
								resetPage();
							}}
						/>
					))}
				</div>
			</section>

			{vendorFacets.length > 1 || vendor
				? (
					<section>
						<h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
							Brand
						</h2>
						<div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto pr-1">
							<FacetRow
								label="All brands"
								active={!vendor}
								onClick={() => {
									setVendor('');
									resetPage();
								}}
							/>
							{vendorFacets.map((row) => (
								<FacetRow
									key={row.slug}
									label={titleCaseSlug(row.slug)}
									count={row.count}
									active={vendor === row.slug}
									onClick={() => {
										setVendor(row.slug);
										resetPage();
									}}
								/>
							))}
						</div>
					</section>
				)
				: null}

			{facets.map((facet) => {
				const expanded = expandedFacets.includes(facet.attributeId);
				const visible = expanded ? facet.buckets : facet.buckets.slice(0, 8);
				return (
					<section key={facet.attributeId}>
						<h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
							{facet.attributeName}
						</h2>
						<div className="mt-3 space-y-2">
							{visible.map((bucket) => {
								const checked = manualValueIds.includes(bucket.valueId)
									|| appliedFilters.some((row) => row.valueId === bucket.valueId);
								return (
									<label
										key={bucket.valueId}
										className="flex cursor-pointer items-center justify-between gap-3 text-[13px] text-ink"
									>
										<span className="flex min-w-0 items-center gap-3">
											<input
												type="checkbox"
												checked={checked}
												onChange={() => toggleValue(bucket.valueId, checked)}
												className="h-4 w-4 shrink-0 rounded border-slate-300 text-ink accent-ink"
											/>
											<span className="truncate">{bucket.value}</span>
										</span>
										<span className="shrink-0 text-[11px] tabular-nums text-slate-400">
											{bucket.count.toLocaleString()}
										</span>
									</label>
								);
							})}
							{facet.buckets.length > 8
								? (
									<button
										type="button"
										className="text-[12px] font-semibold text-ink underline-offset-4 hover:underline"
										onClick={() => setExpandedFacets((prev) =>
											prev.includes(facet.attributeId)
												? prev.filter((id) => id !== facet.attributeId)
												: [...prev, facet.attributeId])}
									>
										{expanded ? 'Show less' : `See ${facet.buckets.length - 8} more`}
									</button>
								)
								: null}
						</div>
					</section>
				);
			})}
		</div>
	);

	return (
		<div className="-mx-6 px-6">
			<div className="mx-auto">
				<nav className="text-[12px] text-slate-500" aria-label="Breadcrumb">
					<ol className="flex flex-wrap items-center gap-2">
						<li><a className="hover:text-ink" href="/place-et-marque">Place et Marque</a></li>
						<li aria-hidden="true">/</li>
						<li>
							{selectedCategory
								? (
									<button type="button" className="hover:text-ink" onClick={() => { setCategory(''); resetPage(); }}>
										Search
									</button>
								)
								: <span className="text-ink">Search</span>}
						</li>
						{selectedCategory
							? (
								<>
									<li aria-hidden="true">/</li>
									<li className="text-ink">{selectedCategory.name}</li>
								</>
							)
							: null}
					</ol>
				</nav>

				<div className="mt-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight text-ink md:text-4xl">
							{selectedCategory?.name ?? (debouncedQuery.trim() ? `Results for “${debouncedQuery.trim()}”` : 'Catalog')}
						</h1>
						<p className="mt-1 text-sm text-slate-600" aria-live="polite">
							{loading && !hasLoaded
								? 'Loading the catalog'
								: total === 0
									? 'No matching products'
									: `${total.toLocaleString()} product${total === 1 ? '' : 's'}`}
						</p>
					</div>
				</div>

				<div
					className={`sticky top-0 z-20 -mx-6 mt-6 border-y bg-frost/95 px-6 py-3 backdrop-blur-md transition ${
						elevated ? 'border-slate-200 shadow-[0_10px_30px_rgba(13,27,42,0.06)]' : 'border-slate-200/80'
					}`}
				>
					{loading
						? <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-slate-200"><div className="h-full w-1/3 animate-pulse bg-ink" /></div>
						: null}
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center">
						<label className="relative flex-1">
							<span className="sr-only">Search products</span>
							<svg
								aria-hidden
								viewBox="0 0 24 24"
								className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
								fill="none"
								stroke="currentColor"
								strokeWidth="1.75"
							>
								<circle cx="11" cy="11" r="6.5" />
								<path d="M16.5 16.5 20 20" />
							</svg>
							<input
								ref={inputRef}
								value={query}
								onChange={(event) => {
									setQuery(event.target.value);
									resetPage();
								}}
								placeholder="Search products, SKUs, and materials"
								className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-16 text-sm text-ink shadow-sm outline-none transition placeholder:text-slate-400 focus:border-ink"
							/>
							<kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-frost px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline">
								/
							</kbd>
						</label>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold lg:hidden"
								onClick={() => setFiltersOpen(true)}
							>
								Filters
								{activeFilterCount > 0
									? (
										<span className="rounded-full bg-ink px-1.5 py-0.5 text-[10px] text-white">
											{activeFilterCount}
										</span>
									)
									: null}
							</button>
							<label className="flex items-center gap-2 text-sm text-slate-600">
								<span className="hidden sm:inline">Sort</span>
								<select
									value={sort}
									onChange={(event) => {
										setSort(event.target.value);
										resetPage();
									}}
									className="rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-ink"
								>
									{SORTS.map((row) => (
										<option key={row.id} value={row.id}>
											{row.label}
										</option>
									))}
								</select>
							</label>
						</div>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
					<p>
						{hasLoaded && total > 0
							? `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`
							: hasLoaded
								? 'Try a broader search or reset filters'
								: ' '}
					</p>
					{activeFilterCount > 0
						? (
							<button type="button" className="font-semibold text-ink underline-offset-4 hover:underline" onClick={clearAll}>
								Clear all
							</button>
						)
						: null}
				</div>

				{vendor || selectedCategory || appliedFilters.length > 0
					? (
						<div className="mt-3 flex flex-wrap gap-2">
							{selectedCategory
								? (
									<Chip onClick={() => { setCategory(''); resetPage(); }}>
										{selectedCategory.name}
									</Chip>
								)
								: null}
							{vendor
								? (
									<Chip onClick={() => { setVendor(''); resetPage(); }}>
										{vendorLabel}
									</Chip>
								)
								: null}
							{appliedFilters.map((filter) => (
								<Chip
									key={`${filter.source}-${filter.valueId}`}
									onClick={() => {
										if(filter.source === 'auto') {
											setOmitValueIds((prev) => [...prev, filter.valueId]);
										}
										else {
											setManualValueIds((prev) => prev.filter((id) => id !== filter.valueId));
										}
										resetPage();
									}}
								>
									{filter.attributeName}: {filter.rollupValue || filter.value}
									{filter.source === 'auto' && filter.rollupValue && filter.value !== filter.rollupValue
										? ` · ${filter.value}`
										: ''}
								</Chip>
							))}
						</div>
					)
					: null}

				<div className="mt-8 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
					<aside className="hidden lg:block">
						{facetRail}
					</aside>

					<div aria-busy={loading}>
						{!hasLoaded
							? <ProductGridSkeleton />
							: results.length === 0
								? (
									<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-20 text-center">
										<p className="text-xl font-semibold text-ink">No products match these filters</p>
										<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
											Clear a department, brand, or attribute, or search by SKU to find an exact listing.
										</p>
										{activeFilterCount > 0
											? (
												<button
													type="button"
													onClick={clearAll}
													className="mt-6 rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white"
												>
													Reset search
												</button>
											)
											: null}
									</div>
								)
								: (
									<div className={`grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-70' : ''}`}>
										{results.map((product) => (
											<ProductCard key={product.id} product={product} />
										))}
									</div>
								)}

						{pageCount > 1 && hasLoaded && results.length > 0
							? (
								<nav className="mt-12 flex flex-wrap items-center justify-center gap-1.5" aria-label="Pagination">
									<button
										type="button"
										disabled={page <= 1}
										onClick={() => setPage((current) => Math.max(1, current - 1))}
										className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
									>
										Previous
									</button>
									{pageItems(page, pageCount).map((item, index) =>
										item === 'gap'
											? (
												<span key={`gap-${index}`} className="px-1 text-slate-400">
													…
												</span>
											)
											: (
												<button
													key={item}
													type="button"
													aria-current={item === page ? 'page' : undefined}
													onClick={() => setPage(item)}
													className={`min-w-10 rounded-lg px-3 py-2 text-sm font-semibold ${
														item === page
															? 'bg-ink text-white'
															: 'border border-slate-300 bg-white text-ink'
													}`}
												>
													{item}
												</button>
											))}
									<button
										type="button"
										disabled={page >= pageCount}
										onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
										className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-40"
									>
										Next
									</button>
								</nav>
							)
							: null}
					</div>
				</div>
			</div>

			{filtersOpen
				? (
					<div className="fixed inset-0 z-40 lg:hidden">
						<button
							type="button"
							className="absolute inset-0 bg-ink/40"
							aria-label="Close filters"
							onClick={() => setFiltersOpen(false)}
						/>
						<div className="absolute inset-y-0 left-0 w-[min(100%,20rem)] overflow-y-auto bg-frost p-6 shadow-2xl">
							<div className="mb-6 flex items-center justify-between">
								<p className="text-sm font-semibold">Filters</p>
								<button type="button" className="text-sm font-semibold" onClick={() => setFiltersOpen(false)}>
									Done
								</button>
							</div>
							{facetRail}
						</div>
					</div>
				)
				: null}
		</div>
	);
}

function Chip({ children, onClick }: { children: ReactNode; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700"
		>
			{children}
			<span aria-hidden="true" className="text-slate-400">×</span>
		</button>
	);
}

function FacetRow({
	label,
	count,
	active = false,
	onClick,
	icon,
}: {
	label: string;
	count?: number;
	active?: boolean;
	onClick: () => void;
	icon?: ReactNode;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-[13px] ${
				active ? 'bg-ink text-white' : 'text-slate-700 hover:bg-white'
			}`}
		>
			<span className="flex min-w-0 items-center gap-1 truncate">
				{icon}
				<span className="truncate">
					{label}
				</span>
			</span>
			{typeof count === 'number'
				? (
					<span className={`ml-2 shrink-0 text-[11px] tabular-nums ${active ? 'text-white/70' : 'text-slate-400'}`}>
						{count.toLocaleString()}
					</span>
				)
				: null}
		</button>
	);
}

function ProductGridSkeleton() {
	return (
		<div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 xl:grid-cols-3">
			{Array.from({ length: 9 }).map((_, index) => (
				<div key={index} className="flex flex-col gap-3">
					<div className="aspect-[5/3] animate-pulse rounded-lg bg-slate-200" />
					<div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
					<div className="h-5 w-full animate-pulse rounded bg-slate-200" />
					<div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
				</div>
			))}
		</div>
	);
}

function ProductCard({ product }: { product: CatalogProductSummary }) {
	const prices = product.offerings.map((row) => row.priceCents);
	const min = prices.length ? Math.min(...prices) : product.primaryPriceCents;
	const max = prices.length ? Math.max(...prices) : product.primaryPriceCents;
	const stocked = product.offerings.find((row) => Number(row.availableQty) > 0);
	const qty = Number(stocked?.availableQty ?? product.availableQty);
	const uom = stocked?.uom ?? product.primaryUom;
	const inStock = Number.isFinite(qty) && qty > 0;
	const low = inStock && qty < 5;

	return (
		<a
			href={`/place-et-marque/${product.vendor.slug}/${product.slug}`}
			className="group flex flex-col"
		>
			<div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-[#cfd1cb]">
				<CatalogCover
					src={product.imageUrls?.[0]}
					alt={product.title}
					width={800}
					height={480}
					className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
					fallback={(
						<div className="absolute inset-0 flex flex-col justify-between p-4">
							<div className="flex items-start justify-between gap-3">
								<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/55">
									{product.vendor.name}
								</p>
								{inStock
									? null
									: (
										<span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
											Sold out
										</span>
									)}
							</div>
							<p className="font-semibold tracking-tight text-ink/80" style={{ fontSize: '2.35rem', lineHeight: 0.9 }}>
								{initials(product.vendor.name)}
							</p>
						</div>
					)}
				/>
				{product.imageUrls?.[0] && !inStock
					? (
						<span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink">
							Sold out
						</span>
					)
					: null}
				<div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
			</div>
			<div className="mt-3 flex flex-1 flex-col gap-1">
				<p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
					{product.category?.name ?? 'Uncategorized'}
				</p>
				<h2 className="line-clamp-2 text-[15px] font-medium leading-snug text-ink group-hover:underline group-hover:decoration-slate-300 group-hover:underline-offset-4">
					{product.title}
				</h2>
				<div className="mt-auto pt-2">
					<p className="text-[15px] font-semibold tabular-nums text-ink">
						{min == null
							? 'Price on request'
							: max != null && max !== min
								? `${formatPrice(min)} – ${formatPrice(max)}`
								: formatPrice(min)}
						{uom && min != null
							? <span className="ml-1 text-[12px] font-medium text-slate-500">/ {uom}</span>
							: null}
					</p>
					<p className={`mt-0.5 text-[12px] ${low ? 'text-amber-800' : inStock ? 'text-slate-500' : 'text-signal'}`}>
						{inStock
							? `${low ? 'Low stock · ' : ''}${formatQty(String(qty), uom)} available`
							: 'Currently unavailable'}
					</p>
				</div>
			</div>
		</a>
	);
}
