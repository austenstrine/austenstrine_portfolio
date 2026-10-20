'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
	deleteCatalogProduct,
	type CatalogProductDetail,
} from '../../lib/catalog-api';
import { upsertCartLine } from '../../lib/checkout-api';
import { ACCESS_REASONS, buildLoginUrl } from '../../lib/accessGate';
import { useSession } from '../../lib/useSession';
import { ProductQuickEdit } from './ProductQuickEdit';

type ProductDetailClientProps = {
	initialProduct: CatalogProductDetail;
};

export function ProductDetailClient({ initialProduct }: ProductDetailClientProps) {
	const router = useRouter();
	const { user } = useSession();
	const [product, setProduct] = useState(initialProduct);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [deletedNotice, setDeletedNotice] = useState<string | null>(null);
	const [selectedOfferingId, setSelectedOfferingId] = useState(
		initialProduct.offerings[0]?.id ?? '',
	);
	const [cartQty, setCartQty] = useState('1');
	const [cartBusy, setCartBusy] = useState(false);
	const [cartMessage, setCartMessage] = useState<string | null>(null);
	const [cartError, setCartError] = useState<string | null>(null);

	async function onAddToCart() {
		if(!selectedOfferingId) {
			return;
		}
		if(!user) {
			router.push(
				buildLoginUrl({
					next: window.location.pathname,
					reason: ACCESS_REASONS.cart,
				}),
			);
			return;
		}

		setCartBusy(true);
		setCartError(null);
		setCartMessage(null);
		try {
			await upsertCartLine(selectedOfferingId, cartQty || '1');
			setCartMessage('Added to cart.');
		}
		catch (error) {
			setCartError(
				error instanceof Error ? error.message : 'Could not add to cart.',
			);
		}
		finally {
			setCartBusy(false);
		}
	}

	async function onDelete() {
		const confirmed = window.confirm(
			`Delete "${product.title}"? Live rows are removed, a CSV receipt is emailed to vendor owners, and an archive copy is kept for 6 months.`,
		);
		if(!confirmed) {
			return;
		}

		setDeleteBusy(true);
		setDeleteError(null);
		try {
			const result = await deleteCatalogProduct(product.id);
			const emailed =
				result.emailedTo.length > 0
					? ` Receipt emailed to ${result.emailedTo.join(', ')}.`
					: ' No owner email was available for the CSV receipt.';
			setDeletedNotice(
				`Deleted. Archive batch ${result.archiveBatchId.slice(0, 8)}.${emailed}`,
			);
			window.setTimeout(() => {
				router.push('/shop/manage');
			}, 1800);
		}
		catch (error) {
			setDeleteError(
				error instanceof Error ? error.message : 'Could not delete product.',
			);
		}
		finally {
			setDeleteBusy(false);
		}
	}

	return (
		<div
			className="
				grid
				gap-8
				lg:grid-cols-[1.2fr_0.8fr]
			"
		>
			<section
				className="
					flex
					flex-col
					gap-4
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
					{product.vendor.name} · {product.sku}
				</p>
				<h1
					className="
						text-4xl
						font-semibold
						tracking-tight
					"
				>
					{product.title}
				</h1>
				<p className="text-slate-600">
					{product.description}
					{(product.tags?.length ?? 0) > 0
						? (
								<div className="mt-3 flex flex-wrap gap-2">
									{product.tags?.map((tag) => (
										<span
											className="
												rounded-full
												bg-slate-100
												px-2.5
												py-1
												text-xs
												font-semibold
												text-slate-700
											"
											key={tag}
										>
											{tag}
										</span>
									))}
								</div>
							)
						: null}
				</p>

				{!deletedNotice
					? (
						<div
							className="
								mt-2
								flex
								flex-col
								gap-3
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-4
							"
						>
							<label className="text-sm">
								<span className="font-semibold">
									Offering
								</span>
								<select
									className="
										mt-1
										w-full
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
									"
									value={selectedOfferingId}
									onChange={(event) =>
										setSelectedOfferingId(event.target.value)
									}
								>
									{product.offerings.map((offering) => (
										<option key={offering.id} value={offering.id}>
											{offering.role} · {offering.sku ?? offering.id} ·{' '}
											{(offering.priceCents / 100).toFixed(2)} ·{' '}
											{offering.availableQty} avail
										</option>
									))}
								</select>
							</label>
							<label className="text-sm">
								<span className="font-semibold">
									Quantity
								</span>
								<input
									className="
										mt-1
										w-32
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
									"
									value={cartQty}
									onChange={(event) => setCartQty(event.target.value)}
								/>
							</label>
							<div
								className="
									flex
									flex-wrap
									items-center
									gap-3
								"
							>
								<button
									type="button"
									disabled={cartBusy || !selectedOfferingId}
									className="
										rounded-full
										bg-ink
										px-4
										py-2.5
										text-sm
										font-semibold
										text-white
										hover:bg-sky
										disabled:opacity-60
									"
									onClick={() => void onAddToCart()}
								>
									{cartBusy ? 'Adding…' : 'Add to cart'}
								</button>
								<Link
									className="
										text-sm
										font-semibold
										text-sky
										hover:underline
									"
									href="/shop/cart"
								>
									View cart
								</Link>
							</div>
							{cartMessage
								? (
									<p className="text-sm text-emerald-700">
										{cartMessage}
									</p>
								)
								: null}
							{cartError
								? (
									<p className="text-sm text-red-700">
										{cartError}
									</p>
								)
								: null}
						</div>
					)
					: null}

				<dl
					className="
						mt-4
						grid
						gap-2
					"
				>
					{product.attributes.map((attribute) => (
						<div
							className="
								flex
								gap-3
								text-sm
							"
							key={attribute.key}
						>
							<dt
								className="
									w-32
									font-semibold
									capitalize
									text-slate-500
								"
							>
								{attribute.key}
							</dt>
							<dd>
								{attribute.value}
							</dd>
						</div>
					))}
				</dl>
			</section>

			<section
				className="
					flex
					flex-col
					gap-4
				"
			>
				{product.permissions.canEdit && !deletedNotice
					? (
						<>
							<ProductQuickEdit product={product} onUpdated={setProduct} />
							<div
								className="
									rounded-2xl
									border
									border-red-100
									bg-red-50
									p-4
								"
							>
								<p className="text-sm text-red-900">
									Deleting archives the product out of live indexes, emails owners a
									CSV of what was removed, and auto-prunes that archive after 6 months.
								</p>
								{deleteError
									? (
										<p
											className="
												mt-2
												text-sm
												text-red-700
											"
										>
											{deleteError}
										</p>
									)
									: null}
								<button
									type="button"
									disabled={deleteBusy}
									className="
										mt-3
										rounded-full
										border
										border-red-300
										bg-white
										px-4
										py-2
										text-sm
										font-semibold
										text-red-700
										hover:border-red-500
										disabled:opacity-60
									"
									onClick={() => void onDelete()}
								>
									{deleteBusy ? 'Deleting…' : 'Delete product'}
								</button>
							</div>
						</>
					)
					: null}

				{deletedNotice
					? (
						<p
							className="
								rounded-2xl
								border
								border-emerald-200
								bg-emerald-50
								p-4
								text-sm
								text-emerald-900
							"
						>
							{deletedNotice}
						</p>
					)
					: null}

				<div
					className="
						rounded-2xl
						border
						border-slate-200
						bg-white
						p-5
					"
				>
					<h2
						className="
							text-sm
							font-semibold
							uppercase
							tracking-wide
							text-slate-500
						"
					>
						Offerings
					</h2>
					<ul
						className="
							mt-4
							flex
							flex-col
							gap-3
						"
					>
						{product.offerings.map((offering) => (
							<li
								className="
									rounded-xl
									border
									border-slate-100
									p-3
								"
								key={offering.id}
							>
								<p className="font-semibold">
									{offering.sku ? `${offering.sku} · ` : ''}
									{offering.role} · {offering.uom.label} ({offering.uom.code})
								</p>
								<p
									className="
										mt-1
										text-sm
										text-slate-600
									"
								>
									${(offering.priceCents / 100).toFixed(2)} · Available {offering.availableQty}{' '}
									{offering.uom.code}
								</p>
								{(offering.parentContainments ?? []).map((link) => (
									<p
										className="
											mt-1
											text-xs
											text-slate-500
										"
										key={link.id}
									>
										From {link.parentSku}: {link.childQtyPerParent} {offering.uom.code} per{' '}
										{link.parentUom}
									</p>
								))}
								{(offering.childContainments ?? []).map((link) => (
									<p
										className="
											mt-1
											text-xs
											text-slate-500
										"
										key={link.id}
									>
										Contains {link.childSku}: {link.childQtyPerParent} {link.childUom} per{' '}
										{offering.uom.code}
									</p>
								))}
							</li>
						))}
					</ul>
					{product.inventoryFromAllocations
						? (
							<p
								className="
									mt-4
									text-xs
									text-slate-500
								"
							>
								Piece availability is derived from pack and broken-pack inventory (cached on each
								offering for search).
							</p>
						)
						: null}
				</div>
			</section>
		</div>
	);
}
