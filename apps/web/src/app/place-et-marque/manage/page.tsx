'use client';

import { Suspense, useEffect, useState } from 'react';
import {
	listMyVendors,
	searchCatalogProducts,
	type CatalogProductSummary,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';
import { RequireAccess } from '../../../components/auth/RequireAccess';

const PAGE_SIZE = 100;

function formatPriceCents(cents: number | null): string {
	if(cents == null) {
		return '—';
	}
	return `$${(cents / 100).toFixed(2)}`;
}

async function loadSellerProductPage(
	vendorRows: VendorSummary[],
	offset: number,
): Promise<{ items: CatalogProductSummary[]; mayHaveMore: boolean }> {
	if(vendorRows.length === 0) {
		return { items: [], mayHaveMore: false };
	}

	const results = await Promise.all(
		vendorRows.map((vendor) =>
			searchCatalogProducts({
				vendor: vendor.slug,
				limit: PAGE_SIZE,
				offset,
			}).catch(() => ({ items: [] as CatalogProductSummary[] })),
		),
	);
	const byId = new Map<string, CatalogProductSummary>();
	let mayHaveMore = false;
	for(const result of results) {
		if(result.items.length >= PAGE_SIZE) {
			mayHaveMore = true;
		}
		for(const item of result.items) {
			byId.set(item.id, item);
		}
	}
	return {
		items: [...byId.values()],
		mayHaveMore,
	};
}

function PlaceEtMarqueManageContent() {
	const { user } = useSession();
	const [products, setProducts] = useState<CatalogProductSummary[]>([]);
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState('');
	const [vendorsReady, setVendorsReady] = useState(false);
	const [loadingProducts, setLoadingProducts] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [nextOffset, setNextOffset] = useState(0);
	const [mayHaveMore, setMayHaveMore] = useState(false);

	const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
	const newProductVendorId = selectedVendor?.id ?? vendors[0]?.id ?? null;
	const newProductVendorName = selectedVendor?.name ?? vendors[0]?.name ?? null;

	useEffect(() => {
		if(!user) {
			setVendors([]);
			setSelectedVendorId('');
			setProducts([]);
			setVendorsReady(false);
			setNextOffset(0);
			setMayHaveMore(false);
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
		if(!user || !vendorsReady) {
			return;
		}

		let cancelled = false;
		setLoadingProducts(true);
		setProducts([]);
		setNextOffset(0);
		setMayHaveMore(false);

		const scope = selectedVendor
			? [selectedVendor]
			: vendors;

		loadSellerProductPage(scope, 0)
			.then((page) => {
				if(!cancelled) {
					setProducts(page.items);
					setNextOffset(PAGE_SIZE);
					setMayHaveMore(page.mayHaveMore);
				}
			})
			.catch(() => {
				if(!cancelled) {
					setProducts([]);
					setMayHaveMore(false);
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
	}, [user, vendorsReady, vendors, selectedVendor]);

	const onLoadMore = async () => {
		if(loadingMore || loadingProducts || !mayHaveMore) {
			return;
		}
		setLoadingMore(true);
		const scope = selectedVendor
			? [selectedVendor]
			: vendors;
		try {
			const page = await loadSellerProductPage(scope, nextOffset);
			setProducts((prev) => {
				const byId = new Map(prev.map((item) => [item.id, item]));
				for(const item of page.items) {
					byId.set(item.id, item);
				}
				return [...byId.values()];
			});
			setNextOffset((current) => current + PAGE_SIZE);
			setMayHaveMore(page.mayHaveMore);
		}
		catch {
			setMayHaveMore(false);
		}
		finally {
			setLoadingMore(false);
		}
	};

	const vendorFilterControls = (
		<>
			<label
				className="
					mt-4
					block
					text-sm
					max-lg:mt-0
					max-lg:flex-1
				"
			>
				<span className="sr-only">
					Change vendor
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

			{vendors.length === 0
				? (
					<p
						className="
							mt-3
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
					mt-4
					inline-flex
					text-sm
					font-semibold
					text-sky
					hover:underline
					max-lg:mt-0
					max-lg:self-center
				"
				href="/place-et-marque/vendors"
			>
				Manage vendors
			</a>
		</>
	);

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

			<div
				className="
					grid
					gap-6
					lg:grid-cols-[14rem_minmax(0,1fr)]
					lg:items-start
				"
			>
				<aside
					className="
						order-2
						lg:order-1
						lg:sticky
						lg:top-24
					"
				>
					<div
						className="
							hidden
							rounded-2xl
							border
							border-slate-200
							bg-white
							p-4
							lg:block
						"
					>
						<p
							className="
								text-xs
								font-semibold
								uppercase
								tracking-wide
								text-slate-500
							"
						>
							Vendor
						</p>
						<p
							className="
								mt-2
								text-sm
								font-semibold
								text-ink
							"
						>
							{selectedVendor
								? selectedVendor.name
								: 'All vendors'
							}
						</p>
						{selectedVendor
							? (
								<p
									className="
										mt-0.5
										truncate
										text-xs
										text-slate-500
									"
								>
									/place-et-marque/{selectedVendor.slug}
									{selectedVendor.myRole
										? ` · ${selectedVendor.myRole}`
										: ''
									}
								</p>
							)
							: (
								<p
									className="
										mt-0.5
										text-xs
										text-slate-500
									"
								>
									Showing inventory across your vendors
								</p>
							)
						}
						{vendorFilterControls}
					</div>

					<details
						className="
							rounded-2xl
							border
							border-slate-200
							bg-white
							p-3
							lg:hidden
						"
					>
						<summary
							className="
								cursor-pointer
								text-sm
								font-semibold
								text-ink
							"
						>
							Vendor filter
							<span
								className="
									ml-2
									font-normal
									text-slate-500
								"
							>
								{selectedVendor
									? selectedVendor.name
									: 'All vendors'
								}
							</span>
						</summary>
						<div
							className="
								mt-3
								flex
								flex-col
								gap-3
							"
						>
							{vendorFilterControls}
						</div>
					</details>
				</aside>

				<section
					className="
						order-1
						flex
						min-w-0
						flex-col
						gap-3
						lg:order-2
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
										text-sm
										font-semibold
										text-sky
										hover:underline
									"
									href={`/place-et-marque/products/new?vendorId=${encodeURIComponent(newProductVendorId)}`}
									title={
										selectedVendor
											? undefined
											: `Creates under ${newProductVendorName}`
									}
								>
									New product
									{!selectedVendor && newProductVendorName
										? ` · ${newProductVendorName}`
										: ''
									}
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
					{vendorsReady && !loadingProducts && mayHaveMore
						? (
							<button
								type="button"
								className="
									self-start
									rounded-full
									border
									border-slate-300
									px-4
									py-2
									text-sm
									font-semibold
									text-slate-700
									hover:border-sky
									hover:text-sky
									disabled:opacity-60
								"
								disabled={loadingMore}
								onClick={() => void onLoadMore()}
							>
								{loadingMore
									? 'Loading…'
									: 'Load more products'
								}
							</button>
						)
						: null
					}
				</section>
			</div>
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
