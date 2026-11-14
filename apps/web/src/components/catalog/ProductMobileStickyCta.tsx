'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

const STACK_VAR = '--product-sticky-cta-stack';
const STACK_GAP_PX = 8;

type ProductMobileStickyCtaProps = {
	priceLabel: string;
	uomCode: string;
	stockStatus: string;
	stockTone: string;
	cartBusy: boolean;
	inStock: boolean;
	onAddToCart: () => void;
};

/**
 * Buyer PDP mobile sticky Add to cart. Publishes --product-sticky-cta-stack
 * so JumpToTop sits above this bar (same pattern as SellerPageActionPane).
 */
export function ProductMobileStickyCta({
	priceLabel,
	uomCode,
	stockStatus,
	stockTone,
	cartBusy,
	inStock,
	onAddToCart,
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
			<div className="mx-auto flex max-w-6xl items-center gap-3 px-3">
				<div className="min-w-0 flex-1">
					<p className="truncate text-sm font-semibold tabular-nums text-ink">
						{priceLabel}
						<span className="ml-1 text-xs font-medium text-slate-500">
							/ {uomCode}
						</span>
					</p>
					<p className={`truncate text-xs ${stockTone}`}>{stockStatus}</p>
				</div>
				<button
					type="button"
					disabled={cartBusy || !inStock}
					onClick={onAddToCart}
					className="
						rounded-full
						bg-asgreen
						px-5
						py-2.5
						text-sm
						font-semibold
						text-white
						disabled:opacity-40
					"
				>
					{cartBusy
						? 'Adding…'
						: inStock
							? 'Add to cart'
							: 'Unavailable'}
				</button>
			</div>
		</div>
	);
}
