'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';
import { BuyBoxCartCta } from './BuyBoxCartCta';

const STACK_VAR = '--product-sticky-cta-stack';
const STACK_GAP_PX = 8;

type ProductMobileStickyCtaProps = {
	priceLabel: string;
	uomCode: string;
	stockStatus: string;
	stockTone: string;
	cartBusy: boolean;
	inStock: boolean;
	/** When true, show qty spinner instead of Add to cart. */
	lineInCart: boolean;
	cartQty: string;
	incrementDisabled?: boolean;
	onAddToCart: () => void;
	onDecrementQty: () => void;
	onIncrementQty: () => void;
};

/**
 * Buyer PDP mobile sticky Add to cart / in-cart qty spinner. Publishes
 * --product-sticky-cta-stack so sitewide JumpToTop lifts above this bar
 * (same pattern as SellerPageActionPane). CTA stacks Add+spinner for stable
 * height (PEM-372).
 */
export function ProductMobileStickyCta({
	priceLabel,
	uomCode,
	stockStatus,
	stockTone,
	cartBusy,
	inStock,
	lineInCart,
	cartQty,
	incrementDisabled = false,
	onAddToCart,
	onDecrementQty,
	onIncrementQty,
}: ProductMobileStickyCtaProps) {
	const hostRef = useRef<HTMLDivElement | null>(null);

	useLayoutEffect(() => {
		const host = hostRef.current;
		if(!host) {
			document.documentElement.style.removeProperty(STACK_VAR);
			return;
		}

		const sync = () => {
			const style = getComputedStyle(host);
			if(style.display === 'none') {
				document.documentElement.style.removeProperty(STACK_VAR);
				return;
			}
			const height = host.offsetHeight;
			if(height < 1) {
				document.documentElement.style.removeProperty(STACK_VAR);
				return;
			}
			const bottomInset = Number.parseFloat(style.bottom) || 0;
			const stack = Math.max(
				0,
				Math.ceil(height + bottomInset + STACK_GAP_PX),
			);
			document.documentElement.style.setProperty(STACK_VAR, `${stack}px`);
		};

		sync();
		const resizeObserver = new ResizeObserver(sync);
		resizeObserver.observe(host);
		window.addEventListener('resize', sync);
		return () => {
			resizeObserver.disconnect();
			window.removeEventListener('resize', sync);
			document.documentElement.style.removeProperty(STACK_VAR);
		};
	}, []);

	useEffect(() => {
		return () => {
			document.documentElement.style.removeProperty(STACK_VAR);
		};
	}, []);

	return (
		<div
			ref={hostRef}
			className="
				fixed
				inset-x-0
				bottom-0
				z-30
				border-t
				border-slate-200
				bg-white/95
				p-3
				backdrop-blur
				lg:hidden
			"
		>
			<div
				className="
					mx-auto
					flex
					max-w-6xl
					items-center
					gap-3
					px-3
				"
			>
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold tabular-nums text-ink">
						{priceLabel}
						<span className="ml-1 text-xs font-medium text-slate-500">
							/ {uomCode}
						</span>
					</p>
					<p className={`truncate text-xs ${stockTone}`}>{stockStatus}</p>
				</div>
				<BuyBoxCartCta
					lineInCart={lineInCart}
					cartBusy={cartBusy}
					inStock={inStock}
					cartQty={cartQty}
					incrementDisabled={incrementDisabled}
					compact
					onAddToCart={onAddToCart}
					onDecrementQty={onDecrementQty}
					onIncrementQty={onIncrementQty}
				/>
			</div>
		</div>
	);
}
