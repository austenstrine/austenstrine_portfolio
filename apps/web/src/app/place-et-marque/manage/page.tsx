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

function formatPriceCents(cents: number | null): string {
	if(cents == null) {
		return '—';
	}
	return `$${(cents / 100).toFixed(2)}`;
}

async function loadSellerProducts(
	vendorRows: VendorSummary[],
): Promise<CatalogProductSummary[]> {
	if(vendorRows.length === 0) {
		return [];
	}

	const results = await Promise.all(
		vendorRows.map((vendor) =>
			searchCatalogProducts({
				vendor: vendor.slug,
				limit: 100,
			}).catch(() => ({ items: [] as CatalogProductSummary[] })),
		),
	);
	const byId = new Map<string, CatalogProductSummary>();
	for(const result of results) {
		for(const item of result.items) {
			byId.set(item.id, item);
		}
	}
	return [...byId.values()];
}

function PlaceEtMarqueManageContent() {
	const { user } = useSession();
	const [products, setProducts] = useState<CatalogProductSummary[]>([]);
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [selectedVendorId, setSelectedVendorId] = useState('');
	const [vendorsReady, setVendorsReady] = useState(false);
	const [loadingProducts, setLoadingProducts] = useState(false);

	const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
	const newProductVendorId = selectedVendor?.id ?? vendors[0]?.id ?? null;

	useEffect(() => {
		if(!user) {
			setVendors([]);
			setSelectedVendorId('');
			setProducts([]);
			setVendorsReady(false);
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

		const scope = selectedVendor
			? [selectedVendor]
			: vendors;

		loadSellerProducts(scope)
			.then((items) => {
				if(!cancelled) {
					setProducts(items);
				}
			})
			.catch(() => {
				if(!cancelled) {
					setProducts([]);
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
						rounded-2xl
						border
						border-slate-200
						bg-white
						p-4
						lg:sticky
						lg:top-24
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

					<label
						className="
							mt-4
							block
							text-sm
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
						"
						href="/place-et-marque/vendors"
					>
						Manage vendors
					</a>
				</aside>

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
										text-sm
										font-semibold
										text-sky
										hover:underline
									"
									href={`/place-et-marque/products/new?vendorId=${encodeURIComponent(newProductVendorId)}`}
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
