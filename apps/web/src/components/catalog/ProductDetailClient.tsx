'use client';

import { useState } from 'react';
import type { CatalogProductDetail } from '../../lib/catalog-api';
import { ProductQuickEdit } from './ProductQuickEdit';

type ProductDetailClientProps = {
	initialProduct: CatalogProductDetail;
};

export function ProductDetailClient({ initialProduct }: ProductDetailClientProps) {
	const [product, setProduct] = useState(initialProduct);

	return (
		<div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
			<section className="flex flex-col gap-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					{product.vendor.name} · {product.sku}
				</p>
				<h1 className="text-4xl font-semibold tracking-tight">{product.title}</h1>
				<p className="text-slate-600">{product.description}</p>

				<dl className="mt-4 grid gap-2">
					{product.attributes.map((attribute) => (
						<div key={attribute.key} className="flex gap-3 text-sm">
							<dt className="w-32 font-semibold capitalize text-slate-500">{attribute.key}</dt>
							<dd>{attribute.value}</dd>
						</div>
					))}
				</dl>
			</section>

			<section className="flex flex-col gap-4">
				{product.permissions.canEdit ? (
					<ProductQuickEdit product={product} onUpdated={setProduct} />
				) : null}

				<div
					className="
						rounded-2xl
						border
						border-slate-200
						bg-white
						p-5
					"
				>
					<h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
						Offerings
					</h2>
					<ul className="mt-4 flex flex-col gap-3">
						{product.offerings.map((offering) => (
							<li
								key={offering.id}
								className="
									rounded-xl
									border
									border-slate-100
									p-3
								"
							>
								<p className="font-semibold">
									{offering.role} · {offering.uom.label} ({offering.uom.code})
								</p>
								<p className="mt-1 text-sm text-slate-600">
									${(offering.priceCents / 100).toFixed(2)} · Available {offering.availableQty}{' '}
									{offering.uom.code}
								</p>
								{offering.pieceLink ? (
									<p className="mt-1 text-xs text-slate-500">
										Linked pack: {offering.pieceLink.pieceQtyPerPack} {offering.uom.code} per{' '}
										{offering.pieceLink.packUom}
									</p>
								) : null}
								{offering.packLink ? (
									<p className="mt-1 text-xs text-slate-500">
										Linked piece: {offering.packLink.pieceQtyPerPack} {offering.packLink.pieceUom}{' '}
										per {offering.uom.code}
									</p>
								) : null}
							</li>
						))}
					</ul>
					{product.inventoryFromAllocations ? (
						<p className="mt-4 text-xs text-slate-500">
							Piece availability is derived from pack and broken-pack inventory (cached on each
							offering for search).
						</p>
					) : null}
				</div>
			</section>
		</div>
	);
}
