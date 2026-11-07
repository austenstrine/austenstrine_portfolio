'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
	searchCatalogProducts,
	type CatalogProductSummary,
	type CatalogSearchFilter,
	type CatalogSearchResult,
	type CatalogTermFacet,
} from '../../lib/catalog-api';
import { vendorViewHref } from '../../lib/vendor-ref';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import {
	SearchExtrasPortal,
	useCatalogSearch,
} from './CatalogSearchContext';
import { CatalogSortMenu } from './CatalogSortMenu';
import { ProductCard } from './ProductCard';

const PAGE_SIZE = 24;

function parseList(raw: string | null) {
	return (raw ?? '').split(',').map((row) => row.trim()).filter(Boolean);
}

type SearchUrlState = {
	q: string;
	category: string;
	vendor: string;
	sort: string;
	page: number;
	inStock: boolean;
	manualValueIds: string[];
	omitValueIds: string[];
};

function parseSearchUrl(searchParams: { get: (key: string) => string | null }): SearchUrlState {
	return {
		q: searchParams.get('q') ?? '',
		category: searchParams.get('category') ?? '',
		vendor: searchParams.get('vendor') ?? '',
		sort: searchParams.get('sort') ?? 'relevance',
		page: Math.max(Number(searchParams.get('page') ?? '1'), 1),
		inStock: searchParams.get('inStock') === '1',
		manualValueIds: parseList(searchParams.get('values')),
		omitValueIds: parseList(searchParams.get('omit')),
	};
}

function searchQueryString(state: SearchUrlState) {
	const params = new URLSearchParams();
	if(state.q.trim()) {
		params.set('q', state.q.trim());
	}
	if(state.category) {
		params.set('category', state.category);
	}
	if(state.vendor) {
		params.set('vendor', state.vendor);
	}
	if(state.sort !== 'relevance') {
		params.set('sort', state.sort);
	}
	if(state.page > 1) {
		params.set('page', String(state.page));
	}
	if(state.inStock) {
		params.set('inStock', '1');
	}
	if(state.manualValueIds.length) {
		params.set('values', state.manualValueIds.join(','));
	}
	if(state.omitValueIds.length) {
		params.set('omit', state.omitValueIds.join(','));
	}
	return params.toString();
}

function titleCaseSlug(slug: string) {
	return slug
		.split(/[-_]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
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

type CatalogSearchExperienceProps = {
	/** When set, search stays scoped to this seller (buyer vendor storefront). */
	lockedVendor?: { slug: string; name: string } | null;
	/**
	 * Storefront profile above owns seller identity chrome.
	 * Hide the duplicate breadcrumb/H1; keep category and search headings.
	 */
	hideVendorIdentityChrome?: boolean;
};

export function CatalogSearchExperience({
	lockedVendor = null,
	hideVendorIdentityChrome = false,
}: CatalogSearchExperienceProps = {}) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const {
		setQuery,
		setCommittedQuery,
		syncCategory,
		categories,
		setPageDock,
		setPageExtras,
	} = useCatalogSearch();

	const searchKey = searchParams.toString();
	const committed = useMemo(() => parseSearchUrl(new URLSearchParams(searchKey)), [searchKey]);
	const {
		q: committedQuery,
		category,
		vendor: urlVendor,
		sort,
		page,
		inStock,
		manualValueIds,
		omitValueIds,
	} = committed;
	const vendor = lockedVendor?.slug || urlVendor;

	const [filtersOpen, setFiltersOpen] = useState(false);
	const [expandedFacets, setExpandedFacets] = useState<string[]>([]);

	const [results, setResults] = useState<CatalogProductSummary[]>([]);
	const [appliedFilters, setAppliedFilters] = useState<CatalogSearchFilter[]>([]);
	const [facets, setFacets] = useState<CatalogSearchResult['facets']>([]);
	const [vendorFacets, setVendorFacets] = useState<CatalogTermFacet[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [hasLoaded, setHasLoaded] = useState(false);

	useEffect(() => {
		setQuery(committedQuery);
		setCommittedQuery(committedQuery);
		syncCategory(category);
	}, [category, committedQuery, setCommittedQuery, setQuery, syncCategory]);

	const commit = (patch: Partial<SearchUrlState>) => {
		const merged: SearchUrlState = {
			...committed,
			...patch,
		};
		if(lockedVendor) {
			// Seller is path-scoped; keep it out of the query string.
			merged.vendor = '';
		}
		const next = searchQueryString(merged);
		const currentQuery = lockedVendor
			? searchQueryString({ ...committed, vendor: '' })
			: searchQueryString(committed);
		if(next === currentQuery) {
			return;
		}
		router.push(next ? `${pathname}?${next}` : pathname, { scroll: false });
	};

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if(event.key === 'Escape' && filtersOpen) {
				setFiltersOpen(false);
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [filtersOpen]);

	useEffect(() => {
		let active = true;
		setLoading(true);
		searchCatalogProducts({
			q: committedQuery.trim() || undefined,
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
	}, [committedQuery, category, vendor, omitValueIds, manualValueIds, sort, page, inStock]);

	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
	const rangeEnd = Math.min(page * PAGE_SIZE, total);
	const selectedCategory = categories.find((row) => row.slug === category);
	const catalogHeading = selectedCategory?.name
		?? (committedQuery.trim()
			? `Results for “${committedQuery.trim()}”`
			: hideVendorIdentityChrome
				? 'Products'
				: lockedVendor?.name
					?? null);
	const vendorLabel = lockedVendor?.name
		?? (vendor ? titleCaseSlug(vendor) : '');
	const clearableFilterCount = [
		committedQuery.trim() ? 1 : 0,
		vendor && !lockedVendor ? 1 : 0,
		inStock ? 1 : 0,
		manualValueIds.length,
		omitValueIds.length,
	].reduce((sum, n) => sum + n, 0);

	const clearAll = () => {
		setQuery('');
		commit({
			q: '',
			vendor: lockedVendor ? lockedVendor.slug : '',
			inStock: false,
			manualValueIds: [],
			omitValueIds: [],
			sort: 'relevance',
			page: 1,
		});
	};

	const toggleValue = (valueId: string, checked: boolean) => {
		if(checked) {
			commit({
				manualValueIds: manualValueIds.filter((id) => id !== valueId),
				omitValueIds: omitValueIds.includes(valueId)
					? omitValueIds
					: [...omitValueIds, valueId],
				page: 1,
			});
		}
		else {
			commit({
				manualValueIds: manualValueIds.includes(valueId)
					? manualValueIds
					: [...manualValueIds, valueId],
				omitValueIds: omitValueIds.filter((id) => id !== valueId),
				page: 1,
			});
		}
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
							commit({
								inStock: event.target.checked,
								page: 1,
							});
						}}
						className="
							h-4
							w-4
							rounded
							border-slate-300
							text-asgreen
							accent-asgreen
						"
					/>
					In stock
				</label>
			</section>

			{!lockedVendor && (vendorFacets.length > 1 || vendor)
				? (
					<section>
						<h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
							Brand
						</h2>
						<div className="mt-2 space-y-0.5">
							<FacetRow
								label="All brands"
								active={!vendor}
								onClick={() => {
									commit({
										vendor: '',
										page: 1,
									});
								}}
							/>
							{vendorFacets.map((row) => (
								<FacetRow
									key={row.slug}
									label={titleCaseSlug(row.slug)}
									count={row.count}
									active={vendor === row.slug}
									onClick={() => {
										router.push(vendorViewHref(row.slug));
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
												className="
													h-4
													w-4
													shrink-0
													rounded
													border-slate-300
													text-asgreen
													accent-asgreen
												"
											/>
											<span className="truncate">{bucket.value}</span>
										</span>
										<span
											className="
												shrink-0
												pr-1
												text-[11px]
												tabular-nums
												text-slate-400
											"
										>
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

	const headingTag = hideVendorIdentityChrome
		? 'h2'
		: 'h1';
	const HeadingTag = headingTag;

	return (
		<div className="-mx-gutter min-w-0 max-w-full overflow-x-hidden px-gutter">
			<div className="mx-auto min-w-0 max-w-full">
				{!hideVendorIdentityChrome
					? (
						<nav className="text-[12px] text-slate-500" aria-label="Breadcrumb">
							<ol className="flex flex-wrap items-center gap-2">
								<li>
									<a
										className="hover:text-ink"
										href="/place-et-marque"
									>
										Place et Marque
									</a>
								</li>
								<li aria-hidden="true">/</li>
								{lockedVendor
									? (
										<>
											<li>
												{selectedCategory || committedQuery.trim()
													? (
														<button
															type="button"
															className="hover:text-ink"
															onClick={() => {
																setQuery('');
																commit({
																	q: '',
																	category: '',
																	page: 1,
																});
															}}
														>
															{lockedVendor.name}
														</button>
													)
													: (
														<span className="text-ink">
															{lockedVendor.name}
														</span>
													)}
											</li>
											{selectedCategory
												? (
													<>
														<li aria-hidden="true">/</li>
														<li className="text-ink">{selectedCategory.name}</li>
													</>
												)
												: null}
										</>
									)
									: (
										<>
											<li>
												{selectedCategory
													? (
														<button type="button" className="hover:text-ink" onClick={() => commit({ category: '', page: 1 })}>
															Shop
														</button>
													)
													: <span className="text-ink">Shop</span>}
											</li>
											{selectedCategory
												? (
													<>
														<li aria-hidden="true">/</li>
														<li className="text-ink">{selectedCategory.name}</li>
													</>
												)
												: null}
										</>
									)}
							</ol>
						</nav>
					)
					: null}

				{catalogHeading
					? (
						<div className={`${hideVendorIdentityChrome ? 'mt-0' : 'mt-5'} min-w-0 max-w-full`}>
							<HeadingTag
								className="
									min-w-0
									max-w-full
									truncate
									text-3xl
									font-semibold
									tracking-tight
									text-ink
									md:text-4xl
								"
								title={catalogHeading}
							>
								{catalogHeading}
							</HeadingTag>
							<p className="mt-1 text-sm text-slate-600" aria-live="polite">
								{loading && !hasLoaded
									? 'Loading the catalog'
									: total === 0
										? 'No matching products'
										: `${total.toLocaleString()} product${total === 1 ? '' : 's'}`}
							</p>
						</div>
					)
					: null}

				{(!lockedVendor && vendor) || appliedFilters.length > 0
					? (
						<div className="mt-3 flex flex-wrap gap-2">
							{!lockedVendor && vendor
								? (
									<Chip onClick={() => commit({ vendor: '', page: 1 })}>
										{vendorLabel}
									</Chip>
								)
								: null}
							{appliedFilters.map((filter) => (
								<Chip
									key={`${filter.source}-${filter.valueId}`}
									onClick={() => {
										if(filter.source === 'auto') {
											commit({
												omitValueIds: omitValueIds.includes(filter.valueId)
													? omitValueIds
													: [...omitValueIds, filter.valueId],
												page: 1,
											});
										}
										else {
											commit({
												manualValueIds: manualValueIds.filter((id) => id !== filter.valueId),
												page: 1,
											});
										}
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

				{!hideVendorIdentityChrome
					? (
						<p className="mt-6 flex flex-wrap gap-3 text-sm lg:mt-8">
							<a
								className="
									rounded
									font-semibold
									text-sky
									underline
									underline-offset-2
									focus:outline
									focus:outline-2
									focus:outline-offset-2
									focus:outline-sky
								"
								href="#catalog-results"
							>
								Skip to results
							</a>
						</p>
					)
					: null}

				<div className="mt-3 grid gap-10 lg:grid-cols-[240px_minmax(0,1fr)]">
					<aside
						className="
							hidden
							lg:sticky
							lg:top-[var(--catalog-header-h)]
							lg:block
							lg:h-0
							lg:min-h-[min(100%,calc(100vh-var(--catalog-header-h)))]
							lg:max-h-[calc(100vh-var(--catalog-header-h))]
							lg:self-start
							lg:overflow-y-auto
							lg:py-3
							lg:pr-4
							lg:scrollbar-thin-quiet
						"
					>
						{facetRail}
					</aside>

					<div
						aria-busy={loading}
						id="catalog-results"
						tabIndex={-1}
					>
						<div
							className="
								relative
								mb-4
								flex
								min-h-10
								flex-wrap
								items-center
								justify-between
								gap-3
								text-sm
								text-slate-600
							"
							ref={setPageDock}
						>
							{loading
								? (
									<div
										className="
											absolute
											inset-x-0
											-top-1
											h-0.5
											overflow-hidden
											bg-slate-200
										"
									>
										<div
											className="
												h-full
												w-1/3
												animate-pulse
												bg-sky
											"
										/>
									</div>
								)
								: null}
							<div
								className="
									flex
									min-w-0
									flex-wrap
									items-center
									gap-3
								"
							>
								<p>
									{hasLoaded && total > 0
										? `Showing ${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`
										: hasLoaded
											? 'Try a broader search or reset filters'
											: ' '}
								</p>
								{clearableFilterCount > 0
									? (
										<button
											type="button"
											className="
												font-semibold
												text-ink
												underline-offset-4
												hover:underline
											"
											onClick={clearAll}
										>
											Clear all
										</button>
									)
									: null}
							</div>
							<div
								className="
									ml-auto
									flex
									flex-wrap
									items-center
									gap-2
									empty:hidden
								"
								ref={setPageExtras}
							/>
							<SearchExtrasPortal>
								<button
									aria-label={
										clearableFilterCount > 0
											? `Filters, ${clearableFilterCount} applied`
											: 'Filters'
									}
									className="
										inline-flex
										h-10
										shrink-0
										items-center
										gap-1.5
										rounded-full
										border
										border-slate-300
										bg-white
										px-3
										text-sm
										font-semibold
										text-ink
										lg:hidden
									"
									onClick={() => setFiltersOpen(true)}
									type="button"
								>
									Filters
									{clearableFilterCount > 0
										? (
											<span
												className="
													inline-flex
													min-w-4
													items-center
													justify-center
													rounded-full
													bg-asgreen
													px-1.5
													text-center
													text-[10px]
													font-semibold
													leading-4
													text-white
												"
											>
												{clearableFilterCount}
											</span>
										)
										: null}
								</button>
								<CatalogSortMenu
									onChoose={(id) => {
										commit({
											page: 1,
											sort: id,
										});
									}}
									sort={sort}
								/>
							</SearchExtrasPortal>
						</div>
						{!hasLoaded
							? <ProductGridSkeleton />
							: results.length === 0
								? (
									<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-8 py-20 text-center">
										<p className="text-xl font-semibold text-ink">No products match these filters</p>
										<p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
											Clear a category, brand, or attribute, or search by SKU to find an exact listing.
										</p>
										{clearableFilterCount > 0
											? (
												<button
													type="button"
													onClick={clearAll}
													className="mt-6 rounded-full bg-sky px-5 py-2.5 text-sm font-semibold text-white"
												>
													Reset search
												</button>
											)
											: null}
									</div>
								)
								: (
									<div className={`grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 ${loading ? 'opacity-70' : ''}`}>
										{results.map((product) => (
											<ProductCard key={product.id} product={product} />
										))}
									</div>
								)}

						{pageCount > 1 && hasLoaded && results.length > 0
							? (
								<nav
									aria-label="Pagination"
									className="
										mt-12
										flex
										flex-wrap
										items-center
										justify-center
										gap-1.5
									"
								>
									<PagerButton
										ariaLabel="Previous page"
										disabled={page <= 1}
										onClick={() => commit({ page: Math.max(1, page - 1) })}
									>
										<ArrowLeftIcon
											className="h-4 w-4"
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
													onClick={() => commit({ page: item })}
												>
													{item}
												</PagerButton>
											))}
									<PagerButton
										ariaLabel="Next page"
										disabled={page >= pageCount}
										onClick={() => commit({ page: Math.min(pageCount, page + 1) })}
									>
										<ArrowRightIcon
											className="h-4 w-4"
										/>
									</PagerButton>
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
							className="absolute inset-0 bg-sky/40"
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
						inline-flex
						min-w-10
						items-center
						justify-center
						rounded-full
						bg-asgreen/15
						px-3
						py-2
						text-sm
						font-semibold
						text-asgreen
						focus-visible:outline
						focus-visible:outline-2
						focus-visible:outline-offset-2
						focus-visible:outline-asgreen
					`
					: `
						inline-flex
						min-w-10
						items-center
						justify-center
						rounded-full
						border
						border-slate-300
						bg-white
						px-3
						py-2
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
}: {
	label: string;
	count?: number;
	active?: boolean;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={
				active
					? `
						flex
						w-full
						items-center
						justify-between
						rounded-full
						bg-asgreen/15
						px-3.5
						py-1.5
						text-left
						text-[13px]
						text-asgreen
					`
					: `
						flex
						w-full
						items-center
						justify-between
						rounded-full
						px-3.5
						py-1.5
						text-left
						text-[13px]
						text-slate-700
						hover:bg-white
					`
			}
		>
			<span className="truncate">
				{label}
			</span>
			{typeof count === 'number'
				? (
					<span
						className={
							active
								? `
									ml-2
									shrink-0
									text-[11px]
									tabular-nums
									text-asgreen/70
								`
								: `
									ml-2
									shrink-0
									text-[11px]
									tabular-nums
									text-slate-400
								`
						}
					>
						{count.toLocaleString()}
					</span>
				)
				: null}
		</button>
	);
}

/** Match ProductCard chrome so skeleton→grid does not jump vertically. */
export function ProductGridSkeleton() {
	return (
		<div
			className="
				grid
				grid-cols-2
				gap-3
				sm:gap-5
				lg:grid-cols-3
			"
		>
			{Array.from({ length: 9 }).map((_, index) => (
				<div
					className="
						flex
						h-full
						flex-col
						overflow-hidden
						rounded-2xl
						border
						border-slate-200
						bg-white
					"
					key={index}
				>
					<div className="aspect-square animate-pulse bg-slate-200" />
					<div
						className="
							flex
							flex-1
							flex-col
							gap-1
							px-3
							pb-4
							pt-3
						"
					>
						<div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
						<div className="min-h-[2.5rem] w-full animate-pulse rounded bg-slate-200" />
						<div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
						<div className="mt-auto space-y-1 pt-2">
							<div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
							<div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
