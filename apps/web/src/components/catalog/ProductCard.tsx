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
	InPlaceCardEditToggle,
	InPlaceCategorySelect,
	InPlaceError,
	InPlaceFieldSurface,
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
import { PencilIcon } from '../icons/PencilIcon';
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
			<InPlaceFieldSurface
				display={node}
				label={label}
				onActivate={() => onActivateField(field)}
			/>
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
								right-3
								top-3
								z-30
								inline-flex
								h-9
								w-9
								items-center
								justify-center
								rounded-full
								border
								border-slate-300
								bg-white/95
								text-ink
								opacity-0
								shadow-[0_4px_12px_rgba(13,27,42,0.12)]
								transition-opacity
								duration-150
								pointer-events-none
								group-hover:pointer-events-auto
								group-hover:opacity-100
								focus-visible:pointer-events-auto
								focus-visible:opacity-100
								hover:border-asgreen
								hover:text-asgreen
								[@media(hover:none)]:pointer-events-auto
								[@media(hover:none)]:opacity-100
							"
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								onActivateField('images');
							}}
							type="button"
						>
							<PencilIcon className="h-3.5 w-3.5" />
						</button>
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
	onActivateField,
}: {
	product: CatalogProductSummary;
	onUpdated: (next: CatalogProductSummary) => void;
	/** When set, only these fields render as inputs (field mode). */
	editableFields?: ReadonlySet<InPlaceFieldName> | 'all';
	/** Field mode: hover-pencil activate for fields that are not open. */
	onActivateField?: (field: InPlaceFieldName) => void;
}) {
	const titleId = useId();
	const {
		editTier,
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
	/** Per-field pencils (not bulk page/card open). */
	const fieldMode = !allOpen;
	const showCardSave = editTier === 'card';
	const exitField = () => {
		setActiveFieldKey(null);
	};
	const categoryLabel = display.category?.name ?? 'Uncategorized';
	const priceLabel = display.primaryPriceCents != null
		? formatPrice(display.primaryPriceCents)
		: 'Price on request';

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
					: onActivateField
						? (
							<button
								aria-label="Edit images"
								className="
									absolute
									right-3
									top-3
									z-30
									inline-flex
									h-9
									w-9
									items-center
									justify-center
									rounded-full
									border
									border-slate-300
									bg-white/95
									text-ink
									opacity-0
									shadow-[0_4px_12px_rgba(13,27,42,0.12)]
									transition-opacity
									duration-150
									pointer-events-none
									group-hover:pointer-events-auto
									group-hover:opacity-100
									focus-visible:pointer-events-auto
									focus-visible:opacity-100
									hover:border-asgreen
									hover:text-asgreen
									[@media(hover:none)]:pointer-events-auto
									[@media(hover:none)]:opacity-100
								"
								onClick={(event) => {
									event.preventDefault();
									event.stopPropagation();
									onActivateField('images');
								}}
								type="button"
							>
								<PencilIcon className="h-3.5 w-3.5" />
							</button>
						)
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
				<InPlaceFieldSurface
					display={
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
					}
					edit={edit}
					editing={fieldOpen('category')}
					editor={
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
					}
					field="category"
					label="Edit category"
					onActivate={
						onActivateField && !fieldOpen('category')
							? () => onActivateField('category')
							: undefined
					}
					onExit={fieldMode ? exitField : undefined}
				/>
				<InPlaceFieldSurface
					display={
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
					}
					edit={edit}
					editing={fieldOpen('title')}
					editor={
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
					}
					field="title"
					label="Edit title"
					onActivate={
						onActivateField && !fieldOpen('title')
							? () => onActivateField('title')
							: undefined
					}
					onExit={fieldMode ? exitField : undefined}
				/>
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
						<InPlaceFieldSurface
							className="min-w-0"
							display={
								<p
									className="
										text-[17px]
										font-semibold
										tabular-nums
										text-ink
									"
								>
									{priceLabel}
								</p>
							}
							edit={edit}
							editing={fieldOpen('price')}
							editor={
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
							}
							field="price"
							label="Edit price"
							onActivate={
								onActivateField && !fieldOpen('price')
									? () => onActivateField('price')
									: undefined
							}
							onExit={fieldMode ? exitField : undefined}
						/>
						<InPlaceFieldSurface
							className="min-w-0"
							display={
								uomCode
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
							edit={edit}
							editing={fieldOpen('uom')}
							editor={
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
							}
							field="uom"
							label="Edit unit"
							onActivate={
								onActivateField && !fieldOpen('uom')
									? () => onActivateField('uom')
									: undefined
							}
							onExit={fieldMode ? exitField : undefined}
						/>
					</div>
					<InPlaceFieldSurface
						className={
							low
								? 'mt-0.5 text-[12px] text-amber-800'
								: inStock
									? 'mt-0.5 text-[12px] text-slate-500'
									: 'mt-0.5 text-[12px] text-signal'
						}
						display={
							<span>
								{inStock
									? `${low ? 'Low stock · ' : ''}${qtyCopy} available`
									: 'Currently unavailable'
								}
							</span>
						}
						edit={edit}
						editing={fieldOpen('qty')}
						editor={
							<div className="flex flex-wrap items-baseline gap-1">
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
							</div>
						}
						field="qty"
						label="Edit quantity"
						onActivate={
							onActivateField && !fieldOpen('qty')
								? () => onActivateField('qty')
								: undefined
						}
						onExit={fieldMode ? exitField : undefined}
					/>
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
					{editTier !== 'page'
						? (
							<InPlaceCardEditToggle
								className="text-[12px]"
								productId={display.id}
							/>
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
		setActiveFieldKey,
		setEditTier,
	} = useEditableVendors();
	const [display, setDisplay] = useState(product);

	useEffect(() => {
		setDisplay(product);
	}, [product]);

	const canEdit = canEditVendor(display.vendor.id);
	if(!canEdit) {
		return <BuyerProductCard product={display} />;
	}

	const bulkOpen = productEditOpen(
		editTier,
		display.id,
		activeCardId,
		activeFieldKey,
	);

	if(bulkOpen) {
		return (
			<SellerProductCard
				editableFields="all"
				onUpdated={setDisplay}
				product={display}
			/>
		);
	}

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
			// Price chip also exposes uom when activating price.
			if(field === 'price') {
				fields.add('uom');
			}
		}
	}
	return (
		<SellerProductCard
			editableFields={fields}
			onActivateField={(field) => {
				if(editTier === 'card') {
					setEditTier('field');
				}
				setActiveFieldKey(inPlaceFieldKey(display.id, field));
			}}
			onUpdated={setDisplay}
			product={display}
		/>
	);
}
