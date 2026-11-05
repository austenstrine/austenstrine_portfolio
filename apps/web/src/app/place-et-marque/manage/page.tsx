'use client';

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import {
	listMyVendors,
	searchCatalogProducts,
	type CatalogProductSummary,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { ArrowLeftIcon } from '../../../components/icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../../../components/icons/ArrowRightIcon';

/** Match catalog-search hard cap (`Math.min(..., 96)`); 100 never returns a full page. */
const PAGE_SIZE = 96;

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

async function loadSellerProductPage(
	vendorRows: VendorSummary[],
	page: number,
): Promise<{ items: CatalogProductSummary[]; total: number; pageCount: number }> {
	if(vendorRows.length === 0) {
		return { items: [], total: 0, pageCount: 1 };
	}

	const offset = (page - 1) * PAGE_SIZE;
	const results = await Promise.all(
		vendorRows.map((vendor) =>
			searchCatalogProducts({
				vendor: vendor.slug,
				limit: PAGE_SIZE,
				offset,
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
			Math.max(1, Math.ceil(vendorTotal / PAGE_SIZE)),
		);
		for(const item of result.items) {
			byId.set(item.id, item);
		}
	}
	return {
		items: [...byId.values()],
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

function PlaceEtMarqueManageContent() {
	const { user } = useSession();
	const [products, setProducts] = useState<CatalogProductSummary[]>([]);
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState('');
	const [vendorsReady, setVendorsReady] = useState(false);
	const [loadingProducts, setLoadingProducts] = useState(false);
	const [page, setPage] = useState(1);
	const [pageCount, setPageCount] = useState(1);
	const [total, setTotal] = useState(0);

	const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
	const newProductVendorId = selectedVendor?.id ?? vendors[0]?.id ?? null;
	const newProductVendorName = selectedVendor?.name ?? vendors[0]?.name ?? null;

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
	}, [selectedVendorId, vendorsReady]);

	useEffect(() => {
		if(!user || !vendorsReady) {
			return;
		}

		let cancelled = false;
		setLoadingProducts(true);

		const scope = selectedVendor
			? [selectedVendor]
			: vendors;

		loadSellerProductPage(scope, page)
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
	}, [user, vendorsReady, vendors, selectedVendor, page]);

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
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
					Inventory for vendors you can edit. Open a product to change price, qty, or full listing details.
				</p>
			</div>

			<div
				className="
					flex
					flex-wrap
					items-end
					gap-x-4
					gap-y-3
				"
			>
				{user
					? (
						<p
							className="
								text-sm
								text-slate-600
							"
						>
							Signed in as {user.email}
						</p>
					)
					: null
				}

				{vendorsReady && vendors.length > 0
					? (
						<label
							className="
								min-w-[12rem]
								flex-1
								text-sm
								sm:max-w-xs
								sm:flex-none
							"
						>
							<span
								className="
									mb-1
									block
									text-xs
									font-semibold
									uppercase
									tracking-wide
									text-slate-500
								"
							>
								Vendor
							</span>
							<select
								className="
									w-full
									rounded-lg
									border
									border-slate-300
									bg-white
									px-3
									py-2
									text-sm
								"
								value={selectedVendorId}
								onChange={(event) => setSelectedVendorId(event.target.value)}
							>
								<option value="">
									All vendors
								</option>
								{vendors.map((vendor) => (
									<option
										key={vendor.id}
										value={vendor.id}
									>
										{vendor.name}
									</option>
								))}
							</select>
						</label>
					)
					: null
				}

				{vendorsReady && vendors.length === 0
					? (
						<p
							className="
								text-xs
								text-slate-500
							"
						>
							No vendor memberships yet.
						</p>
					)
					: null
				}

				<a
					className="
						text-sm
						font-semibold
						text-sky
						hover:underline
					"
					href="/place-et-marque/vendors"
				>
					Manage vendors
				</a>
			</div>

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
						flex-wrap
						items-center
						justify-between
						gap-3
					"
				>
					<h2 className="text-lg font-semibold">
						Your products
					</h2>
					{newProductVendorId
						? (
							<a
								className="
									inline-flex
									items-center
									rounded-full
									bg-asgreen
									px-3.5
									py-2
									text-sm
									font-semibold
									text-white
									hover:bg-asgreen/90
								"
								href={`/place-et-marque/products/new?vendorId=${encodeURIComponent(newProductVendorId)}`}
								title={
									selectedVendor
										? undefined
										: `Creates under ${newProductVendorName}`
								}
							>
								New product
							</a>
						)
						: null
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
								: selectedVendor
									? 'No products yet for this vendor.'
									: 'No products yet for your vendors.'
							}
						</p>
					)
					: null
				}
				{vendorsReady && !loadingProducts && total > 0
					? (
						<p className="text-xs text-slate-500">
							{selectedVendor
								? `Showing ${((page - 1) * PAGE_SIZE + 1).toLocaleString()}–${Math.min(page * PAGE_SIZE, total).toLocaleString()} of ${total.toLocaleString()}`
								: `Page ${page} of ${pageCount} · ${total.toLocaleString()} product${total === 1 ? '' : 's'} across your vendors`
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
							<div
								className="
									flex
									flex-wrap
									gap-3
									text-sm
									font-semibold
								"
							>
								<a
									className="text-sky hover:underline"
									href={`/place-et-marque/${product.vendor.slug}/${product.slug}`}
								>
									View
								</a>
								<a
									className="text-sky hover:underline"
									href={`/place-et-marque/products/${product.id}/edit`}
								>
									Edit
								</a>
							</div>
						</div>
					))
					: null
				}
				{vendorsReady && !loadingProducts && pageCount > 1 && products.length > 0
					? (
						<nav
							aria-label="Pagination"
							className="
								mt-4
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
								onClick={() => setPage((current) => Math.max(1, current - 1))}
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
											onClick={() => setPage(item)}
										>
											{item}
										</PagerButton>
									))}
							<PagerButton
								ariaLabel="Next page"
								disabled={page >= pageCount}
								onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
							>
								<ArrowRightIcon
									className="h-4 w-4"
								/>
							</PagerButton>
						</nav>
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
