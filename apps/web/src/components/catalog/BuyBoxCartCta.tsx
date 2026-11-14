'use client';

import { CartQtySpinner } from './CartQtySpinner';

type BuyBoxCartCtaProps = {
	lineInCart: boolean;
	cartBusy: boolean;
	inStock: boolean;
	cartQty: string;
	incrementDisabled?: boolean;
	/** Compact sticky bar vs full-width buy box. */
	compact?: boolean;
	onAddToCart: () => void;
	onDecrementQty: () => void;
	onIncrementQty: () => void;
};

/**
 * Stacked Add + spinner in one grid cell so swap never changes height
 * (PEM-372). Visibility toggles; both stay mounted.
 */
export function BuyBoxCartCta({
	lineInCart,
	cartBusy,
	inStock,
	cartQty,
	incrementDisabled = false,
	compact = false,
	onAddToCart,
	onDecrementQty,
	onIncrementQty,
}: BuyBoxCartCtaProps) {
	const addClassName = compact
		? `
			rounded-full
			bg-asgreen
			px-5
			py-2.5
			text-sm
			font-semibold
			text-white
			disabled:opacity-40
		`
		: `
			w-full
			rounded-full
			bg-asgreen
			px-5
			py-3
			text-sm
			font-semibold
			text-white
			hover:bg-asgreen/90
			disabled:opacity-40
		`;

	return (
		<div
			data-pem-actions
			className={
				compact
					? `
						ml-auto
						grid
						shrink-0
						justify-end
					`
					: `
						grid
						w-full
						justify-end
					`
			}
		>
			<button
				type="button"
				tabIndex={lineInCart ? -1 : 0}
				aria-hidden={lineInCart}
				disabled={cartBusy || !inStock || lineInCart}
				onClick={onAddToCart}
				className={`
					col-start-1
					row-start-1
					${addClassName}
					${lineInCart
						? 'invisible pointer-events-none'
						: ''
					}
				`}
			>
				{cartBusy && !lineInCart
					? 'Adding…'
					: inStock
						? 'Add to cart'
						: 'Unavailable'}
			</button>
			<div
				className={`
					col-start-1
					row-start-1
					${lineInCart
						? ''
						: 'invisible pointer-events-none'
					}
				`}
				aria-hidden={!lineInCart}
			>
				<CartQtySpinner
					quantity={cartQty}
					busy={cartBusy}
					incrementDisabled={incrementDisabled}
					onDecrement={onDecrementQty}
					onIncrement={onIncrementQty}
					compact={compact}
				/>
			</div>
		</div>
	);
}
