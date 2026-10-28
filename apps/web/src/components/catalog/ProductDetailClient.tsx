'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
	deleteCatalogProduct,
	type CatalogOfferingDetail,
	type CatalogProductDetail,
	type CatalogProductSummary,
} from '../../lib/catalog-api';
import { upsertCartLine } from '../../lib/checkout-api';
import { ACCESS_REASONS, buildLoginUrl } from '../../lib/accessGate';
import { useSession } from '../../lib/useSession';
import { CatalogCover } from './CatalogCover';
import { ProductQuickEdit } from './ProductQuickEdit';
import { TermHint } from './TermHint';
import { CompoundQtyField } from './CompoundQtyField';
import { formatQty } from '../../lib/uom-qty';

type ProductDetailClientProps = {
	initialProduct: CatalogProductDetail;
	relatedProducts?: CatalogProductSummary[];
};

function formatPrice(cents: number, currency = 'USD') {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100);
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

function firstBuyableId(product: CatalogProductDetail) {
	const stocked = product.offerings.find((row) => Number(row.availableQty) > 0);
	return stocked?.id ?? product.offerings[0]?.id ?? '';
}

function offeringTitle(offering: CatalogOfferingDetail) {
	if(offering.role === 'PACK') {
		return offering.uom.label;
	}
	if(offering.role === 'PIECE') {
		return `Per ${offering.uom.label.toLowerCase()}`;
	}
	return offering.uom.label;
}

function stockCopy(offering: CatalogOfferingDetail | undefined) {
	if(!offering) {
		return {
			status: 'Currently unavailable',
			detail: '',
			tone: 'text-signal',
			inStock: false,
			low: false,
		};
	}
	const qty = Number(offering.availableQty);
	if(!Number.isFinite(qty) || qty <= 0) {
		return {
			status: 'Currently unavailable',
			detail: '',
			tone: 'text-signal',
			inStock: false,
			low: false,
		};
	}
	const low = qty < 5;
	const amount = formatQty(offering.availableQty, offering.uom.code);
	return {
		status: low ? `Only ${amount} left` : 'In stock',
		detail: low ? '' : `${amount} available`,
		tone: low ? 'text-amber-800' : 'text-emerald-800',
		inStock: true,
		low,
	};
}

function heroMark(product: CatalogProductDetail) {
	const attr = product.attributes.find((row) => row.value && row.value.length <= 14)
		?? product.attributes[0];
	if(attr?.value) {
		return { mark: attr.value, label: attr.attributeName };
	}
	return {
		mark: initials(product.vendor.name),
		label: product.category?.name ?? '',
	};
}

function appendFact(
	target: Array<{ label: string; value: string }>,
	label: string,
	value?: string | number | null,
) {
	if(value == null || value === '') {
		return;
	}
	const next = String(value);
	const existing = target.find((row) => row.label === label);
	if(existing) {
		const parts = existing.value.split(', ');
		if(!parts.includes(next)) {
			existing.value = `${existing.value}, ${next}`;
		}
		return;
	}
	target.push({ label, value: next });
}

function specGroups(product: CatalogProductDetail, selectedSku?: string) {
	const details: Array<{ label: string; value: string }> = [];
	const identifiers: Array<{ label: string; value: string }> = [];
	const push = appendFact;

	push(identifiers, 'SKU', selectedSku || product.sku);
	push(details, 'Brand', product.vendor.name);
	push(details, 'Department', product.category?.name);
	for(const attribute of product.attributes) {
		push(details, attribute.attributeName, attribute.value);
	}
	for(const scalar of product.scalarValues ?? []) {
		const value = scalar.stringValue
			?? scalar.numericValue
			?? (scalar.booleanValue == null ? null : scalar.booleanValue ? 'Yes' : 'No');
		push(details, scalar.attributeName, value);
	}
	push(details, 'Weight', product.weightNumeric ? `${product.weightNumeric} ${product.weightUnit ?? ''}`.trim() : null);
	push(
		details,
		'Dimensions',
		product.lengthNumeric || product.widthNumeric || product.heightNumeric
			? [product.lengthNumeric, product.widthNumeric, product.heightNumeric]
				.filter(Boolean)
				.join(' × ') + (product.linearUnit ? ` ${product.linearUnit}` : '')
			: null,
	);
	push(details, 'Voltage', product.voltageNumeric);
	push(details, 'Wattage', product.wattageNumeric);
	push(identifiers, 'GTIN', product.gtin);
	push(identifiers, 'MPN', product.mpn);
	push(identifiers, 'Origin', product.countryOfOrigin);
	return { details, identifiers };
}

export function ProductDetailClient({
	initialProduct,
	relatedProducts = [],
}: ProductDetailClientProps) {
	const router = useRouter();
	const { user } = useSession();
	const [product, setProduct] = useState(initialProduct);
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);
	const [deletedNotice, setDeletedNotice] = useState<string | null>(null);
	const [activeImage, setActiveImage] = useState(0);
	const [selectedOfferingId, setSelectedOfferingId] = useState(() => firstBuyableId(initialProduct));
	const [cartQty, setCartQty] = useState('1');
	const [cartBusy, setCartBusy] = useState(false);
	const [cartMessage, setCartMessage] = useState<string | null>(null);
	const [cartError, setCartError] = useState<string | null>(null);

	const selectedOffering = product.offerings.find((offering) => offering.id === selectedOfferingId);
	const stock = stockCopy(selectedOffering);
	const hero = heroMark(product);
	const gallery = product.imageUrls ?? [];
	const activeSrc = gallery[Math.min(activeImage, Math.max(gallery.length - 1, 0))];
	const specs = useMemo(
		() => specGroups(product, selectedOffering?.sku || product.sku),
		[product, selectedOffering?.sku],
	);
	const searchHref = product.category
		? `/place-et-marque/search?category=${encodeURIComponent(product.category.slug)}`
		: '/place-et-marque/search';
	const vendorHref = `/place-et-marque/search?vendor=${encodeURIComponent(product.vendor.slug)}`;
	const highlightAttributes = useMemo(() => {
		const rows: Array<{ label: string; value: string }> = [];
		for(const attribute of product.attributes) {
			appendFact(rows, attribute.attributeName, attribute.value);
		}
		return rows.slice(0, 6);
	}, [product.attributes]);

	function selectOffering(id: string) {
		setSelectedOfferingId(id);
		setCartQty('1');
		setCartMessage(null);
		setCartError(null);
	}

	async function onAddToCart() {
		if(!selectedOfferingId || !stock.inStock) {
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
			setCartMessage('Added to cart');
		}
		catch(error) {
			setCartError(error instanceof Error ? error.message : 'Could not add to cart.');
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
			const emailed = result.emailedTo.length > 0
				? ` Receipt emailed to ${result.emailedTo.join(', ')}.`
				: ' No owner email was available for the CSV receipt.';
			setDeletedNotice(`Deleted. Archive batch ${result.archiveBatchId.slice(0, 8)}.${emailed}`);
			window.setTimeout(() => {
				router.push('/place-et-marque/manage');
			}, 1800);
		}
		catch(error) {
			setDeleteError(error instanceof Error ? error.message : 'Could not delete product.');
		}
		finally {
			setDeleteBusy(false);
		}
	}

	const buyBox = selectedOffering && !deletedNotice
		? (
			<div className="flex flex-col gap-5">
				<div>
					<p className={`text-sm font-semibold ${stock.tone}`}>
						{stock.status}
					</p>
					<p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
						{formatPrice(selectedOffering.priceCents, selectedOffering.currency)}
						<span className="ml-2 text-base font-medium text-slate-500">
							/ {selectedOffering.uom.code}
						</span>
					</p>
					{stock.detail
						? <p className="mt-1 text-sm text-slate-500">{stock.detail}</p>
						: null}
				</div>

				{product.offerings.length > 1
					? (
						<fieldset>
							<legend className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
								Buying options
							</legend>
							<div className="mt-3 grid gap-2">
								{product.offerings.map((offering) => {
									const offeringStock = stockCopy(offering);
									const selected = offering.id === selectedOfferingId;
									return (
										<button
											key={offering.id}
											type="button"
											onClick={() => selectOffering(offering.id)}
											className={`rounded-xl border px-4 py-3 text-left transition ${
												selected
													? 'border-ink bg-ink text-white'
													: 'border-slate-200 bg-white text-ink hover:border-ink/40'
											}`}
										>
											<div className="flex items-baseline justify-between gap-3">
												<p className="text-sm font-semibold">{offeringTitle(offering)}</p>
												<p className="text-sm font-semibold tabular-nums">
													{formatPrice(offering.priceCents, offering.currency)}
												</p>
											</div>
											<p className={`mt-1 text-xs ${selected ? 'text-white/70' : 'text-slate-500'}`}>
												{offeringStock.inStock ? offeringStock.status : 'Unavailable'}
												{offeringStock.detail ? ` · ${offeringStock.detail}` : ''}
											</p>
										</button>
									);
								})}
							</div>
						</fieldset>
					)
					: null}

				<CompoundQtyField
					label="Quantity"
					uomCode={selectedOffering.uom.code}
					value={cartQty}
					onChange={setCartQty}
					disabled={!stock.inStock}
				/>

				{cartMessage
					? (
						<p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800" aria-live="polite">
							{cartMessage}.{' '}
							<Link href="/place-et-marque/cart" className="underline underline-offset-2">
								View cart
							</Link>
						</p>
					)
					: null}
				{cartError
					? (
						<p className="text-sm text-red-700" aria-live="polite">
							{cartError}
						</p>
					)
					: null}

				<div className="flex flex-col gap-2">
					<button
						type="button"
						disabled={cartBusy || !stock.inStock}
						onClick={() => void onAddToCart()}
						className="w-full rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white hover:bg-sky disabled:opacity-40"
					>
						{cartBusy ? 'Adding…' : stock.inStock ? 'Add to cart' : 'Unavailable'}
					</button>
					<Link
						href="/place-et-marque/cart"
						className="text-center text-sm font-semibold text-ink underline-offset-4 hover:underline"
					>
						View cart
					</Link>
				</div>

				<div className="border-t border-slate-100 pt-4 text-[12px] leading-5 text-slate-500">
					<p>
						Sold by{' '}
						<Link href={vendorHref} className="font-semibold text-ink hover:underline">
							{product.vendor.name}
						</Link>
					</p>
					<p>Ships from seller inventory.</p>
					{(selectedOffering.childContainments ?? []).map((link) => (
						<p key={link.id}>
							{link.childQtyPerParent} {link.childUom} per {selectedOffering.uom.code}
							{link.breakFeeCents
								? ` · ${formatPrice(link.breakFeeCents)} break fee`
								: ''}
						</p>
					))}
					{(selectedOffering.parentContainments ?? []).map((link) => (
						<p key={link.id}>
							{link.childQtyPerParent} {selectedOffering.uom.code} per {link.parentUom}
							{link.parentSku ? ` · ${link.parentSku}` : ''}
						</p>
					))}
				</div>
			</div>
		)
		: null;

	return (
		<div className="flex flex-col gap-10 pb-24 lg:pb-0">
			<nav className="text-[12px] text-slate-500" aria-label="Breadcrumb">
				<ol className="flex flex-wrap items-center gap-2">
					<li>
						<Link className="hover:text-ink" href="/place-et-marque">Place et Marque</Link>
					</li>
					<li aria-hidden="true">/</li>
					<li>
						<Link className="hover:text-ink" href="/place-et-marque/search">Search</Link>
					</li>
					{product.category
						? (
							<>
								<li aria-hidden="true">/</li>
								<li>
									<Link className="hover:text-ink" href={searchHref}>
										{product.category.name}
									</Link>
								</li>
							</>
						)
						: null}
					<li aria-hidden="true">/</li>
					<li className="text-ink">{product.title}</li>
				</ol>
			</nav>

			<div>
				<p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
					<Link className="hover:text-ink" href={vendorHref}>{product.vendor.name}</Link>
					{selectedOffering?.sku || product.sku ? ` · ${selectedOffering?.sku || product.sku}` : ''}
				</p>
				<h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-ink md:text-4xl">
					{product.title}
				</h1>
				{product.description
					? (
						<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
							{product.description}
						</p>
					)
					: null}
				{highlightAttributes.length > 0
					? (
						<dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
							{highlightAttributes.map((attribute) => (
								<div key={attribute.label}>
									<dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
										{attribute.label}
									</dt>
									<dd className="mt-0.5 text-sm font-medium text-ink">{attribute.value}</dd>
								</div>
							))}
						</dl>
					)
					: null}
				{(product.tags?.length ?? 0) > 0
					? (
						<div className="mt-4 flex flex-wrap gap-2">
							{product.tags?.map((tag) => (
								<span
									key={tag}
									className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600"
								>
									{tag.replace(/[-_]+/g, ' ')}
								</span>
							))}
						</div>
					)
					: null}
			</div>

			<div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
				<div className="flex flex-col gap-8">
					<div className="flex flex-col gap-3">
						<div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#cfd1cb] sm:aspect-[5/3]">
							<CatalogCover
								src={activeSrc}
								alt={product.title}
								width={1400}
								height={840}
								className="absolute inset-0 h-full w-full object-cover"
								fallback={(
									<>
										<div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(255,255,255,0.5),transparent_52%)]" />
										<div className="absolute inset-0 flex flex-col justify-between p-6">
											<div className="flex items-start justify-between gap-3">
												<Link
													href={vendorHref}
													className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/55 hover:text-ink"
												>
													{product.vendor.name}
												</Link>
												{stock.inStock
													? null
													: (
														<span className="rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
															Sold out
														</span>
													)}
											</div>
											<div>
												<p className="font-semibold tracking-tight text-ink/80" style={{ fontSize: '4.25rem', lineHeight: 0.85 }}>
													{hero.mark}
												</p>
												{hero.label
													? (
														<p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/50">
															{hero.label}
														</p>
													)
													: null}
											</div>
										</div>
									</>
								)}
							/>
							{activeSrc && !stock.inStock
								? (
									<span className="absolute right-4 top-4 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-ink">
										Sold out
									</span>
								)
								: null}
						</div>
						{gallery.length > 1
							? (
								<div className="flex gap-2 overflow-x-auto">
									{gallery.map((src, index) => (
										<button
											key={`${src}-${index}`}
											type="button"
											onClick={() => setActiveImage(index)}
											className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border ${
												index === activeImage ? 'border-ink' : 'border-transparent'
											}`}
										>
											<CatalogCover
												src={src}
												alt=""
												width={192}
												height={128}
												className="h-full w-full object-cover"
												fallback={null}
											/>
										</button>
									))}
								</div>
							)
							: null}
					</div>

					<div className="lg:hidden">
						{buyBox}
					</div>

					{specs.details.length > 0 || specs.identifiers.length > 0
						? (
							<section>
								<h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
									Product details
								</h2>
								<table className="mt-4 w-full text-sm">
									<tbody>
										{[...specs.details, ...specs.identifiers].map((row) => (
											<tr key={row.label} className="border-t border-slate-200">
												<th className="w-40 py-3 pr-4 text-left font-medium text-slate-500">
													{row.label}
												</th>
												<td className="py-3 text-ink">{row.value}</td>
											</tr>
										))}
									</tbody>
								</table>
							</section>
						)
						: null}

					{product.offerings.length > 1
						? (
							<section>
								<h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
									All buying options
								</h2>
								<ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
									{product.offerings.map((offering) => {
										const offeringStock = stockCopy(offering);
										const selected = offering.id === selectedOfferingId;
										return (
											<li key={offering.id}>
												<button
													type="button"
													onClick={() => selectOffering(offering.id)}
													className={`flex w-full flex-wrap items-baseline justify-between gap-3 py-3 text-left text-sm ${
														selected ? 'text-ink' : 'text-slate-700 hover:text-ink'
													}`}
												>
													<div>
														<p className="font-semibold">
															{offeringTitle(offering)}
															{selected
																? <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Selected</span>
																: null}
														</p>
														<p className="mt-0.5 text-xs text-slate-500">
															{offeringStock.inStock ? offeringStock.status : 'Unavailable'}
															{offering.sku ? ` · ${offering.sku}` : ''}
														</p>
													</div>
													<p className="font-semibold tabular-nums">
														{formatPrice(offering.priceCents, offering.currency)}
														<span className="ml-1 text-xs font-medium text-slate-500">/ {offering.uom.code}</span>
													</p>
												</button>
											</li>
										);
									})}
								</ul>
								{product.inventoryFromAllocations && product.permissions.canEdit
									? (
										<p className="mt-3 text-[12px] leading-5 text-slate-500">
											Piece stock is counted from packs and{' '}
											<span className="inline-flex items-center gap-1">
												broken packs
												<TermHint termId="broken-pack" />
											</span>
											.
										</p>
									)
									: null}
							</section>
						)
						: null}

					<p className="text-sm text-slate-500">
						<Link className="font-semibold text-ink underline-offset-4 hover:underline" href={searchHref}>
							{product.category ? `More in ${product.category.name}` : 'Back to the catalog'}
						</Link>
					</p>
				</div>

				<aside className="hidden lg:block">
					<div className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_0_rgba(13,27,42,0.04)]">
						{buyBox}
					</div>
				</aside>
			</div>

			{relatedProducts.length > 0
				? (
					<section>
						<div className="flex items-end justify-between gap-4">
							<h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
								{product.category ? `More in ${product.category.name}` : 'Related products'}
							</h2>
							<Link className="text-sm font-semibold text-ink underline-offset-4 hover:underline" href={searchHref}>
								View all
							</Link>
						</div>
						<div className="mt-5 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
							{relatedProducts.map((item) => (
								<RelatedTile key={item.id} product={item} />
							))}
						</div>
					</section>
				)
				: null}

			{product.permissions.canEdit && !deletedNotice
				? (
					<details className="rounded-2xl border border-slate-200 bg-white p-5">
						<summary className="cursor-pointer text-sm font-semibold text-ink">
							Vendor tools
						</summary>
						<div className="mt-5 flex flex-col gap-4">
							<ProductQuickEdit product={product} onUpdated={setProduct} />
							<div className="rounded-xl border border-red-100 bg-red-50 p-4">
								<p className="text-sm text-red-900">
									Deleting archives the product out of live indexes, emails owners a CSV of what was removed, and auto-prunes that archive after 6 months.
								</p>
								{deleteError
									? <p className="mt-2 text-sm text-red-700">{deleteError}</p>
									: null}
								<button
									type="button"
									disabled={deleteBusy}
									onClick={() => void onDelete()}
									className="mt-3 rounded-full border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-500 disabled:opacity-60"
								>
									{deleteBusy ? 'Deleting…' : 'Delete product'}
								</button>
							</div>
						</div>
					</details>
				)
				: null}

			{deletedNotice
				? (
					<p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
						{deletedNotice}
					</p>
				)
				: null}

			{selectedOffering && !deletedNotice
				? (
					<div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
						<div className="mx-auto flex max-w-6xl items-center gap-3 px-3">
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-semibold tabular-nums text-ink">
									{formatPrice(selectedOffering.priceCents, selectedOffering.currency)}
									<span className="ml-1 text-xs font-medium text-slate-500">/ {selectedOffering.uom.code}</span>
								</p>
								<p className={`truncate text-xs ${stock.tone}`}>{stock.status}</p>
							</div>
							<button
								type="button"
								disabled={cartBusy || !stock.inStock}
								onClick={() => void onAddToCart()}
								className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
							>
								{cartBusy ? 'Adding…' : stock.inStock ? 'Add to cart' : 'Unavailable'}
							</button>
						</div>
					</div>
				)
				: null}
		</div>
	);
}

function RelatedTile({ product }: { product: CatalogProductSummary }) {
	const prices = product.offerings.map((row) => row.priceCents);
	const min = prices.length ? Math.min(...prices) : product.primaryPriceCents;
	const stocked = product.offerings.find((row) => Number(row.availableQty) > 0);
	const qty = Number(stocked?.availableQty ?? product.availableQty);
	const uom = stocked?.uom ?? product.primaryUom;
	const inStock = Number.isFinite(qty) && qty > 0;

	return (
		<Link href={`/place-et-marque/${product.vendor.slug}/${product.slug}`} className="group flex flex-col">
			<div className="relative aspect-[5/3] overflow-hidden rounded-lg bg-[#cfd1cb]">
				<CatalogCover
					src={product.imageUrls?.[0]}
					alt={product.title}
					width={640}
					height={384}
					className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
					fallback={(
						<div className="absolute inset-0 flex flex-col justify-between p-4">
							<p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/55">
								{product.vendor.name}
							</p>
							<p className="font-semibold tracking-tight text-ink/80" style={{ fontSize: '2.1rem', lineHeight: 0.9 }}>
								{initials(product.vendor.name)}
							</p>
						</div>
					)}
				/>
			</div>
			<p className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
				{product.category?.name ?? 'Uncategorized'}
			</p>
			<h3 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-ink group-hover:underline group-hover:decoration-slate-300 group-hover:underline-offset-4">
				{product.title}
			</h3>
			<p className="mt-2 text-[15px] font-semibold tabular-nums text-ink">
				{min == null ? 'Price on request' : formatPrice(min)}
				{uom && min != null
					? <span className="ml-1 text-[12px] font-medium text-slate-500">/ {uom}</span>
					: null}
			</p>
			<p className={`mt-0.5 text-[12px] ${inStock ? 'text-slate-500' : 'text-signal'}`}>
				{inStock ? 'In stock' : 'Currently unavailable'}
			</p>
		</Link>
	);
}
