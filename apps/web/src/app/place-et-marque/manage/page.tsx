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

function PlaceEtMarqueManageContent() {
	const { user } = useSession();
	const [products, setProducts] = useState<CatalogProductSummary[]>([]);
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [loadingProducts, setLoadingProducts] = useState(false);

	useEffect(() => {
		if(!user) {
			setVendors([]);
			setProducts([]);
			return;
		}

		setLoadingProducts(true);
		listMyVendors()
			.then(async (vendorRows) => {
				setVendors(vendorRows);
				if(vendorRows.length === 0) {
					setProducts([]);
					return;
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
				setProducts([...byId.values()]);
			})
			.catch(() => {
				setVendors([]);
				setProducts([]);
			})
			.finally(() => setLoadingProducts(false));
	}, [user]);

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				Product management
			</h1>
			<p className="max-w-2xl text-slate-600">
				Inventory for vendors you can edit. Open a product to change price, qty, or full listing details.
			</p>

			{user
				? (
					<p className="text-sm text-slate-600">
						Signed in as {user.email}
					</p>
				)
				: null
			}

			<section
				className="
					flex
					flex-col
					gap-3
				"
			>
				<div
					className="
						flex
						items-center
						justify-between
						gap-3
					"
				>
					<h2 className="text-lg font-semibold">
						Your vendors
					</h2>
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
				{vendors.length === 0
					? (
						<p className="text-sm text-slate-500">
							No vendor memberships yet.
						</p>
					)
					: null
				}
				{vendors.map((vendor) => (
					<a
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
							hover:border-sky
						"
						key={vendor.id}
						href={`/place-et-marque/vendors/${vendor.id}`}
					>
						<p className="font-semibold">
							{vendor.name}
						</p>
						<p className="text-sm text-slate-600">
							/place-et-marque/{vendor.slug} · {vendor.myRole}
						</p>
					</a>
				))}
			</section>

			<section
				className="
					flex
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
					{vendors[0]
						? (
							<a
								className="
									text-sm
									font-semibold
									text-sky
									hover:underline
								"
								href={`/place-et-marque/products/new?vendorId=${encodeURIComponent(vendors[0].id)}`}
							>
								New product
							</a>
						)
						: null
					}
				</div>
				{loadingProducts
					? (
						<p className="text-sm text-slate-500">
							Loading your inventory…
						</p>
					)
					: null
				}
				{!loadingProducts && products.length === 0
					? (
						<p className="text-sm text-slate-500">
							{vendors.length === 0
								? 'Create a vendor organization to start listing products.'
								: 'No products yet for your vendors.'
							}
						</p>
					)
					: null
				}
				{products.map((product) => (
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
				))}
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
