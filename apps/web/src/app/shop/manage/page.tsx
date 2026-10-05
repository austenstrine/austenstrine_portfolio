'use client';

import { useEffect, useState } from 'react';
import {
	listMyVendors,
	searchCatalogProducts,
	type CatalogProductSummary,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';

export default function ShopManagePage() {
	const { user, loading } = useSession();
	const [products, setProducts] = useState<CatalogProductSummary[]>([]);
	const [vendors, setVendors] = useState<VendorSummary[]>([]);

	useEffect(() => {
		searchCatalogProducts({}).then(setProducts).catch(() => setProducts([]));
	}, []);

	useEffect(() => {
		if(!user) {
			setVendors([]);
			return;
		}

		listMyVendors().then(setVendors).catch(() => setVendors([]));
	}, [user]);

	return (
		<div className="flex flex-col gap-6">
			<h1 className="text-3xl font-semibold tracking-tight">Product management</h1>
			<p className="max-w-2xl text-slate-600">
				Quick edit appears on product pages when your account has owner or editor access for that
				vendor. Create a vendor organization first if you do not have one yet.
			</p>

			{loading ? <p className="text-sm text-slate-500">Checking session…</p> : null}
			{user ? (
				<p className="text-sm text-slate-600">Signed in as {user.email}</p>
			) : (
				<p className="text-sm text-amber-800">
					Sign in to manage vendor organizations and edit products you are allowed to manage.
				</p>
			)}

			{user ? (
				<section className="flex flex-col gap-3">
					<div className="flex items-center justify-between gap-3">
						<h2 className="text-lg font-semibold">Your vendors</h2>
						<a href="/shop/vendors" className="text-sm font-semibold text-sky hover:underline">
							Manage vendors
						</a>
					</div>
					{vendors.length === 0 ? (
						<p className="text-sm text-slate-500">
							No vendor memberships yet.{' '}
							<a href="/shop/vendors" className="font-semibold text-sky hover:underline">
								Create one
							</a>
						</p>
					) : (
						vendors.map((vendor) => (
							<a
								key={vendor.id}
								href={`/shop/vendors/${vendor.id}`}
								className="
									rounded-xl
									border
									border-slate-200
									bg-white
									p-4
									hover:border-sky
								"
							>
								<p className="font-semibold">{vendor.name}</p>
								<p className="text-sm text-slate-600">
									{vendor.myRole} · {vendor.productCount} products
								</p>
							</a>
						))
					)}
				</section>
			) : null}

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Catalog</h2>
				{products.map((product) => (
					<a
						key={product.id}
						href={`/shop/${product.vendor.slug}/${product.slug}`}
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
							hover:border-sky
						"
					>
						<p className="font-semibold">{product.title}</p>
						<p className="text-sm text-slate-600">{product.vendor.name}</p>
					</a>
				))}
			</section>
		</div>
	);
}
