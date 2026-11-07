'use client';

import { useEffect, useRef, useState } from 'react';
import type {
	CatalogProductDetail,
	CatalogProductSummary,
} from '../../lib/catalog-api';
import { formatAvailableQty } from '../../lib/uom-qty';
import { productViewHref } from '../../lib/vendor-ref';
import { PencilIcon } from '../icons/PencilIcon';
import { useEditableVendors } from './EditableVendorsProvider';
import { ProductCardImageCarousel } from './ProductCardImageCarousel';
import { ProductQuickEditDialog } from './ProductQuickEditDialog';

function formatPrice(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
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

function applyDetailToSummary(
	summary: CatalogProductSummary,
	detail: CatalogProductDetail,
): CatalogProductSummary {
	const primary = detail.offerings[0];
	return {
		...summary,
		title: detail.title,
		description: detail.description,
		tags: detail.tags,
		slug: detail.slug,
		primaryPriceCents: primary?.priceCents ?? summary.primaryPriceCents,
		primaryUom: primary?.uom.code ?? summary.primaryUom,
		availableQty: primary?.availableQty ?? summary.availableQty,
		offerings: detail.offerings.map((offering) => ({
			id: offering.id,
			sku: offering.sku,
			offeringKey: offering.offeringKey,
			role: offering.role,
			priceCents: offering.priceCents,
			uom: offering.uom.code,
			omitFromAvailability: offering.uom.omitFromAvailability,
			availableQty: offering.availableQty,
		})),
	};
}

export function ProductCard({ product }: { product: CatalogProductSummary }) {
	const { canEditVendor } = useEditableVendors();
	const editTriggerRef = useRef<HTMLButtonElement>(null);
	const [display, setDisplay] = useState(product);
	const [editing, setEditing] = useState(false);

	useEffect(() => {
		setDisplay(product);
	}, [product]);

	const canEdit = canEditVendor(display.vendor.id);
	const prices = display.offerings.map((row) => row.priceCents);
	const min = prices.length ? Math.min(...prices) : display.primaryPriceCents;
	const max = prices.length ? Math.max(...prices) : display.primaryPriceCents;
	const stocked = display.offerings.find((row) => Number(row.availableQty) > 0);
	const qty = Number(stocked?.availableQty ?? display.availableQty);
	const uom = stocked?.uom ?? display.primaryUom;
	const qtyCopy = formatAvailableQty(
		String(qty),
		uom,
		stocked?.omitFromAvailability,
	);
	const inStock = Number.isFinite(qty) && qty > 0;
	const low = inStock && qty < 5;
	const href = productViewHref({
		vendorSlug: display.vendor.slug,
		productSlug: display.slug,
	});

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
			{canEdit
				? (
					<button
						aria-label={`Edit ${display.title}`}
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
							shadow-sm
							hover:border-sky
							hover:text-sky
						"
						onClick={(event) => {
							event.preventDefault();
							event.stopPropagation();
							setEditing(true);
						}}
						ref={editTriggerRef}
						type="button"
					>
						<PencilIcon className="h-3.5 w-3.5" />
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
					images={display.imageUrls ?? []}
					alt={display.title}
					fallback={
						(
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
									{display.vendor.name}
								</p>
								<p
									className="
										font-semibold
										tracking-tight
										text-ink/80
									"
									style={{ fontSize: '2.35rem', lineHeight: 0.9 }}
								>
									{initials(display.vendor.name)}
								</p>
							</div>
						)
					}
				/>
				{inStock
					? null
					: (
						<span
							className={
								canEdit
									? `
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
									`
									: `
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
									`
							}
						>
							Sold out
						</span>
					)
				}
			</div>
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
					{display.category?.name ?? 'Uncategorized'}
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
					{display.title}
				</h2>
				<p
					className="
						text-[12px]
						text-slate-500
					"
				>
					Sold by {display.vendor.name}
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
						{min == null
							? 'Price on request'
							: max != null && max !== min
								? `${formatPrice(min)} – ${formatPrice(max)}`
								: formatPrice(min)
						}
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
						{inStock
							? `${low ? 'Low stock · ' : ''}${qtyCopy} available`
							: 'Currently unavailable'
						}
					</p>
				</div>
			</a>
			{editing
				? (
					<ProductQuickEditDialog
						onClose={() => setEditing(false)}
						onUpdated={(detail) => {
							setDisplay(applyDetailToSummary(display, detail));
						}}
						product={display}
						returnFocusRef={editTriggerRef}
					/>
				)
				: null
			}
		</article>
	);
}
