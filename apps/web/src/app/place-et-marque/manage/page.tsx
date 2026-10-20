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

function PlaceEtMarqueManageContent() {
	const { user } = useSession();
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
				Quick edit appears on product pages when your account has owner or editor access for that
				vendor. Create a vendor organization first if you do not have one yet.
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
				<h2 className="text-lg font-semibold">
					Catalog products
				</h2>
				{products.length === 0
					? (
						<p className="text-sm text-slate-500">
							No products in the catalog yet.
						</p>
					)
					: null
				}
				{products.map((product) => (
					<a
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
							hover:border-sky
						"
						key={product.id}
						href={`/place-et-marque/${product.vendor.slug}/${product.slug}`}
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
							{product.vendor.name}
						</p>
						<p className="mt-1 font-semibold">
							{product.title}
						</p>
					</a>
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
