import type { CatalogProductSummary } from '../../lib/catalog-api';
import { formatAvailableQty } from '../../lib/uom-qty';
import { ProductCardImageCarousel } from './ProductCardImageCarousel';

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

export function ProductCard({ product }: { product: CatalogProductSummary }) {
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
	const href = `/place-et-marque/${product.vendor.slug}/${product.slug}`;

	return (
		<article
			className="
				group
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
					href={href}
					images={product.imageUrls ?? []}
					alt={product.title}
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
									{product.vendor.name}
								</p>
								<p
									className="
										font-semibold
										tracking-tight
										text-ink/80
									"
									style={{ fontSize: '2.35rem', lineHeight: 0.9 }}
								>
									{initials(product.vendor.name)}
								</p>
							</div>
						)
					}
				/>
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
					{product.category?.name ?? 'Uncategorized'}
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
		</article>
	);
}
