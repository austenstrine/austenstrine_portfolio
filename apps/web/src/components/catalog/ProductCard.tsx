'use client';

import {
	useEffect,
	useId,
	useState,
	type ReactNode,
} from 'react';
import type { CatalogProductSummary } from '../../lib/catalog-api';
import { formatAvailableQty } from '../../lib/uom-qty';
import { productViewHref } from '../../lib/vendor-ref';
import {
	fieldEditOpen,
	inPlaceFieldKey,
	productEditOpen,
	useEditableVendors,
	type InPlaceFieldName,
} from './EditableVendorsProvider';
import {
	InPlaceActivateHint,
	InPlaceCategorySelect,
	InPlaceError,
	InPlaceFieldSaveButton,
	InPlaceFullEditLink,
	InPlaceImageActions,
	InPlacePriceInput,
	InPlaceQtyInput,
	InPlaceSaveControls,
	InPlaceTitleInput,
	InPlaceUomSelect,
	applyDetailToSummary,
	useInPlaceProductEdit,
} from './InPlaceProductFields';
import { ProductCardImageCarousel } from './ProductCardImageCarousel';

function formatPrice(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
		cents / 100,
	);
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

function ImageFallback({ vendorName }: { vendorName: string }) {
	return (
		<div
			className="
				absolute
				inset-0
				flex
				flex-col
				justify-between
				p-4
			"
		>
			<p
				className="
					text-[10px]
					font-semibold
					uppercase
					tracking-[0.18em]
					text-ink/55
				"
			>
				{vendorName}
			</p>
			<p
				className="
					font-semibold
					tracking-tight
					text-ink/80
				"
				style={{ fontSize: '2.35rem', lineHeight: 0.9 }}
			>
				{initials(vendorName)}
			</p>
		</div>
	);
}

function BuyerProductCard({
	product,
	onActivateCard,
	onActivateField,
}: {
	product: CatalogProductSummary;
	onActivateCard?: () => void;
	onActivateField?: (field: InPlaceFieldName) => void;
}) {
	const prices = product.offerings.map((row) => row.priceCents);
	const min = prices.length ? Math.min(...prices) : product.primaryPriceCents;
	const max = prices.length ? Math.max(...prices) : product.primaryPriceCents;
	const stocked = product.offerings.find((row) => Number(row.availableQty) > 0);
	const qty = Number(stocked?.availableQty ?? product.availableQty);
	const uom = stocked?.uom ?? product.primaryUom;
	const qtyCopy = formatAvailableQty(
		String(qty),
		uom,
		stocked?.omitFromAvailability,
	);
	const inStock = Number.isFinite(qty) && qty > 0;
	const low = inStock && qty < 5;
	const href = productViewHref({
		vendorSlug: product.vendor.slug,
		productSlug: product.slug,
	});
	const categoryLabel = product.category?.name ?? 'Uncategorized';
	const priceLabel = min == null
		? 'Price on request'
		: max != null && max !== min
			? `${formatPrice(min)} – ${formatPrice(max)}`
			: formatPrice(min);
	const stockLabel = inStock
		? `${low ? 'Low stock · ' : ''}${qtyCopy} available`
		: 'Currently unavailable';

	const wrapField = (
		field: InPlaceFieldName,
		label: string,
		node: ReactNode,
	) => {
		if(!onActivateField) {
			return node;
		}
		return (
			<InPlaceActivateHint
				label={label}
				onActivate={() => onActivateField(field)}
			>
				{node}
			</InPlaceActivateHint>
		);
	};

	return (
		<article
			className="
				group
				relative
				flex
				h-full
				flex-col
				overflow-hidden
				rounded-2xl
				border
				border-slate-200
				bg-white
				transition
				hover:border-ink/20
				hover:shadow-[0_8px_24px_rgba(13,27,42,0.08)]
			"
		>
			{onActivateCard
				? (
					<button
						aria-label="Edit this card"
						className="
							absolute
							right-3
							top-3
							z-30
							rounded-full
							border
							border-slate-300
							bg-white/95
							px-2.5
							py-1
							text-[10px]
							font-semibold
							uppercase
							tracking-wide
							text-ink
							hover:border-asgreen
							hover:text-asgreen
						"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							onActivateCard();
						}}
						type="button"
					>
						Edit card
					</button>
				)
				: null
			}
			<div
				className="
					relative
					aspect-square
					overflow-hidden
					bg-canvas
				"
			>
				<ProductCardImageCarousel
					href={href}
					images={product.imageUrls ?? []}
					alt={product.title}
					fallback={<ImageFallback vendorName={product.vendor.name} />}
				/>
				{onActivateField
					? (
						<button
							aria-label="Edit images"
							className="
								absolute
								inset-0
								z-20
								cursor-pointer
								bg-transparent
							"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onActivateField('images');
							}}
							type="button"
						/>
					)
					: null
				}
				{inStock
					? null
					: (
						<span
							className="
								absolute
								right-3
								top-3
								z-20
								rounded-full
								bg-white/95
								px-2
								py-0.5
								text-[10px]
								font-semibold
								uppercase
								tracking-wide
								text-ink
							"
						>
							Sold out
						</span>
					)
				}
			</div>
			{onActivateField
				? (
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
						{wrapField(
							'category',
							'Edit category',
							<p
								className="
									text-[11px]
									font-medium
									uppercase
									tracking-[0.14em]
									text-slate-500
								"
							>
								{categoryLabel}
							</p>,
						)}
						{wrapField(
							'title',
							'Edit title',
							<h2
								className="
									line-clamp-2
									min-h-[2.5rem]
									text-[15px]
									font-medium
									leading-snug
									text-ink
								"
							>
								{product.title}
							</h2>,
						)}
						<p
							className="
								text-[12px]
								text-slate-500
							"
						>
							Sold by {product.vendor.name}
						</p>
						<div className="mt-auto pt-2">
							{wrapField(
								'price',
								'Edit price',
								<p
									className="
										text-[17px]
										font-semibold
										tabular-nums
										text-ink
									"
								>
									{priceLabel}
									{uom && min != null
										? (
											<span
												className="
													ml-1
													text-[12px]
													font-medium
													text-slate-500
												"
											>
												/ {uom}
											</span>
										)
										: null
									}
								</p>,
							)}
							{wrapField(
								'qty',
								'Edit quantity',
								<p
									className={
										low
											? 'mt-0.5 text-[12px] text-amber-800'
											: inStock
												? 'mt-0.5 text-[12px] text-slate-500'
												: 'mt-0.5 text-[12px] text-signal'
									}
								>
									{stockLabel}
								</p>,
							)}
						</div>
						<a
							className="
								mt-2
								self-start
								text-[12px]
								font-semibold
								text-slate-500
								hover:text-sky
							"
							href={href}
						>
							Open
						</a>
					</div>
				)
				: (
					<a
						className="
							flex
							flex-1
							flex-col
							gap-1
							px-3
							pb-4
							pt-3
						"
						href={href}
					>
						<p
							className="
								text-[11px]
								font-medium
								uppercase
								tracking-[0.14em]
								text-slate-500
							"
						>
							{categoryLabel}
						</p>
						<h2
							className="
								line-clamp-2
								min-h-[2.5rem]
								text-[15px]
								font-medium
								leading-snug
								text-ink
								group-hover:underline
								group-hover:decoration-slate-300
								group-hover:underline-offset-4
							"
						>
							{product.title}
						</h2>
						<p
							className="
								text-[12px]
								text-slate-500
							"
						>
							Sold by {product.vendor.name}
						</p>
						<div className="mt-auto pt-2">
							<p
								className="
									text-[17px]
									font-semibold
									tabular-nums
									text-ink
								"
							>
								{priceLabel}
								{uom && min != null
									? (
										<span
											className="
												ml-1
												text-[12px]
												font-medium
												text-slate-500
											"
										>
											/ {uom}
										</span>
									)
									: null
								}
							</p>
							<p
								className={
									low
										? 'mt-0.5 text-[12px] text-amber-800'
										: inStock
											? 'mt-0.5 text-[12px] text-slate-500'
											: 'mt-0.5 text-[12px] text-signal'
								}
							>
								{stockLabel}
							</p>
						</div>
					</a>
				)
			}
		</article>
	);
}

function SellerProductCard({
	product,
	onUpdated,
	editableFields,
}: {
	product: CatalogProductSummary;
	onUpdated: (next: CatalogProductSummary) => void;
	/** When set, only these fields render as inputs (element tier). */
	editableFields?: ReadonlySet<InPlaceFieldName> | 'all';
}) {
	const titleId = useId();
	const {
		editTier,
		setActiveCardId,
		setActiveFieldKey,
	} = useEditableVendors();
	const edit = useInPlaceProductEdit({
		product,
		onUpdated: (detail) => {
			onUpdated(applyDetailToSummary(product, detail));
		},
	});
	const display = edit.detail
		? applyDetailToSummary(product, edit.detail)
		: product;
	const qty = Number(edit.qtyOnHand);
	const uomCode = edit.lookups?.uoms.find((row) => row.id === edit.uomId)?.code
		?? display.primaryUom;
	const omit = edit.detail?.offerings.find((row) => row.id === edit.offeringId)
		?.uom.omitFromAvailability
		?? display.offerings.find((row) => row.id === edit.offeringId)
			?.omitFromAvailability;
	const qtyCopy = formatAvailableQty(String(edit.qtyOnHand), uomCode, omit);
	const inStock = Number.isFinite(qty) && qty > 0;
	const low = inStock && qty < 5;
	const href = productViewHref({
		vendorSlug: display.vendor.slug,
		productSlug: display.slug,
	});
	const qtySuffix = qtyCopy.replace(/^\S+\s*/, '') || 'available';
	const allOpen = editableFields === 'all' || editableFields == null;
	const fieldOpen = (field: InPlaceFieldName) =>
		allOpen || (editableFields?.has(field) ?? false);
	const showCardSave = editTier === 'card';
	const showFieldSave = editTier === 'element';

	return (
		<article
			aria-busy={edit.saving || edit.imageBusy || !edit.ready}
			aria-labelledby={titleId}
			className="
				group
				relative
				flex
				h-full
				flex-col
				overflow-hidden
				rounded-2xl
				border
				border-slate-200
				bg-white
				transition
				hover:border-ink/20
				hover:shadow-[0_8px_24px_rgba(13,27,42,0.08)]
			"
		>
			<div
				className="
					relative
					aspect-square
					overflow-hidden
					bg-canvas
				"
			>
				<ProductCardImageCarousel
					alt={display.title}
					editable={fieldOpen('images')}
					fallback={<ImageFallback vendorName={display.vendor.name} />}
					images={display.imageUrls ?? []}
				/>
				{fieldOpen('images')
					? <InPlaceImageActions edit={edit} />
					: null
				}
				{!inStock
					? (
						<span
							className="
								absolute
								left-3
								top-3
								z-20
								rounded-full
								bg-white/95
								px-2
								py-0.5
								text-[10px]
								font-semibold
								uppercase
								tracking-wide
								text-ink
							"
						>
							Sold out
						</span>
					)
					: null
				}
			</div>
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
				{fieldOpen('category')
					? (
						<>
							<InPlaceCategorySelect
								className="
									text-[11px]
									font-medium
									uppercase
									tracking-[0.14em]
									text-slate-500
								"
								edit={edit}
							/>
							{showFieldSave
								? (
									<InPlaceFieldSaveButton
										edit={edit}
										field="category"
									/>
								)
								: null
							}
						</>
					)
					: (
						<p
							className="
								text-[11px]
								font-medium
								uppercase
								tracking-[0.14em]
								text-slate-500
							"
						>
							{display.category?.name ?? 'Uncategorized'}
						</p>
					)
				}
				{fieldOpen('title')
					? (
						<>
							<InPlaceTitleInput
								className="
									min-h-[2.5rem]
									text-[15px]
									font-medium
									leading-snug
									text-ink
								"
								edit={edit}
								id={titleId}
							/>
							{showFieldSave
								? (
									<InPlaceFieldSaveButton
										edit={edit}
										field="title"
									/>
								)
								: null
							}
						</>
					)
					: (
						<h2
							className="
								line-clamp-2
								min-h-[2.5rem]
								text-[15px]
								font-medium
								leading-snug
								text-ink
							"
							id={titleId}
						>
							{display.title}
						</h2>
					)
				}
				<p
					className="
						text-[12px]
						text-slate-500
					"
				>
					Sold by {display.vendor.name}
				</p>
				<div className="mt-auto pt-2">
					<div
						className="
							flex
							flex-wrap
							items-baseline
							gap-1
						"
					>
						{fieldOpen('price')
							? (
								<InPlacePriceInput
									className="
										w-[6.75rem]
										text-[17px]
										font-semibold
										tabular-nums
										text-ink
									"
									edit={edit}
								/>
							)
							: (
								<p
									className="
										text-[17px]
										font-semibold
										tabular-nums
										text-ink
									"
								>
									{display.primaryPriceCents != null
										? formatPrice(display.primaryPriceCents)
										: 'Price on request'
									}
								</p>
							)
						}
						{fieldOpen('uom')
							? (
								<InPlaceUomSelect
									className="
										w-auto
										max-w-[5.5rem]
										text-[12px]
										font-medium
										text-slate-500
									"
									edit={edit}
								/>
							)
							: uomCode
								? (
									<span
										className="
											text-[12px]
											font-medium
											text-slate-500
										"
									>
										/ {uomCode}
									</span>
								)
								: null
						}
					</div>
					{showFieldSave && (fieldOpen('price') || fieldOpen('uom'))
						? (
							<div className="mt-1 flex flex-wrap gap-2">
								{fieldOpen('price')
									? (
										<InPlaceFieldSaveButton
											edit={edit}
											field="price"
										/>
									)
									: null
								}
								{fieldOpen('uom')
									? (
										<InPlaceFieldSaveButton
											edit={edit}
											field="uom"
										/>
									)
									: null
								}
							</div>
						)
						: null
					}
					<div
						className={
							low
								? 'mt-0.5 flex flex-wrap items-baseline gap-1 text-[12px] text-amber-800'
								: inStock
									? 'mt-0.5 flex flex-wrap items-baseline gap-1 text-[12px] text-slate-500'
									: 'mt-0.5 flex flex-wrap items-baseline gap-1 text-[12px] text-signal'
						}
					>
						{fieldOpen('qty')
							? (
								<>
									<InPlaceQtyInput
										className="
											w-[4.5rem]
											tabular-nums
										"
										edit={edit}
									/>
									<span>
										{inStock
											? `${low ? 'Low stock · ' : ''}${qtySuffix}`
											: 'Currently unavailable'
										}
									</span>
								</>
							)
							: (
								<span>
									{inStock
										? `${low ? 'Low stock · ' : ''}${qtyCopy} available`
										: 'Currently unavailable'
									}
								</span>
							)
						}
					</div>
					{showFieldSave && fieldOpen('qty')
						? (
							<InPlaceFieldSaveButton
								className="mt-1"
								edit={edit}
								field="qty"
							/>
						)
						: null
					}
				</div>
				<InPlaceError
					className="mt-2"
					error={edit.error}
				/>
				{showCardSave
					? (
						<InPlaceSaveControls
							className="mt-2"
							dirty={edit.dirty}
							onDiscard={() => {
								edit.discard();
							}}
							onSave={() => {
								void edit.saveAll();
							}}
							saving={edit.saving}
							scope="card"
						/>
					)
					: null
				}
				<div
					className="
						mt-2
						flex
						flex-wrap
						items-center
						gap-3
					"
				>
					<a
						className="
							self-start
							text-[12px]
							font-semibold
							text-slate-500
							hover:text-sky
						"
						href={href}
					>
						Open
					</a>
					<InPlaceFullEditLink product={display} />
					{editTier === 'card'
						? (
							<button
								className="
									text-[12px]
									font-semibold
									text-slate-500
									hover:text-sky
								"
								onClick={() => setActiveCardId(null)}
								type="button"
							>
								Done
							</button>
						)
						: null
					}
					{editTier === 'element'
						? (
							<button
								className="
									text-[12px]
									font-semibold
									text-slate-500
									hover:text-sky
								"
								onClick={() => setActiveFieldKey(null)}
								type="button"
							>
								Done
							</button>
						)
						: null
					}
				</div>
			</div>
		</article>
	);
}

export function ProductCard({ product }: { product: CatalogProductSummary }) {
	const {
		canEditVendor,
		editTier,
		activeCardId,
		activeFieldKey,
		setActiveCardId,
		setActiveFieldKey,
	} = useEditableVendors();
	const [display, setDisplay] = useState(product);

	useEffect(() => {
		setDisplay(product);
	}, [product]);

	const canEdit = canEditVendor(display.vendor.id);
	if(!canEdit || editTier === 'off') {
		return <BuyerProductCard product={display} />;
	}

	const open = productEditOpen(
		editTier,
		display.id,
		activeCardId,
		activeFieldKey,
	);

	if(editTier === 'card' && !open) {
		return (
			<BuyerProductCard
				onActivateCard={() => setActiveCardId(display.id)}
				product={display}
			/>
		);
	}

	if(editTier === 'element' && !open) {
		return (
			<BuyerProductCard
				onActivateField={(field) => {
					setActiveFieldKey(inPlaceFieldKey(display.id, field));
				}}
				product={display}
			/>
		);
	}

	if(editTier === 'element' && open) {
		const fields = new Set<InPlaceFieldName>();
		for(const field of [
			'title',
			'description',
			'category',
			'price',
			'uom',
			'qty',
			'images',
		] as InPlaceFieldName[]) {
			if(fieldEditOpen(
				editTier,
				display.id,
				field,
				activeCardId,
				activeFieldKey,
			)) {
				fields.add(field);
				// Price chip also exposes uom when activating price from buyer card.
				if(field === 'price') {
					fields.add('uom');
				}
			}
		}
		return (
			<SellerProductCard
				editableFields={fields}
				onUpdated={setDisplay}
				product={display}
			/>
		);
	}

	return (
		<SellerProductCard
			editableFields="all"
			onUpdated={setDisplay}
			product={display}
		/>
	);
}
