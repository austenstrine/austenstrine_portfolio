'use client';

import { MinusIcon } from '../icons/MinusIcon';
import { PlusIcon } from '../icons/PlusIcon';

type CartQtySpinnerProps = {
	quantity: string;
	busy?: boolean;
	decrementDisabled?: boolean;
	incrementDisabled?: boolean;
	onDecrement: () => void;
	onIncrement: () => void;
	/** Compact for sticky mobile bar; full-width buy-box default. */
	compact?: boolean;
};

/**
 * In-cart quantity stepper for PDP buy box / sticky CTA.
 * − to 0 removes the line (handled by parent); + updates cart qty.
 */
export function CartQtySpinner({
	quantity,
	busy = false,
	decrementDisabled = false,
	incrementDisabled = false,
	onDecrement,
	onIncrement,
	compact = false,
}: CartQtySpinnerProps) {
	const pad = compact
		? 'px-3 py-2'
		: 'px-4 py-3';

	return (
		<div
			role="group"
			aria-label="Cart quantity"
			className={
				compact
					? `
						inline-flex
						items-center
						rounded-full
						border
						border-asgreen
						bg-asgreen/10
					`
					: `
						flex
						w-full
						items-center
						rounded-full
						border
						border-asgreen
						bg-asgreen/10
					`
			}
		>
			<button
				type="button"
				aria-label="Decrease quantity"
				disabled={busy || decrementDisabled}
				onClick={onDecrement}
				className={`
					${pad}
					rounded-full
					text-asgreen
					disabled:opacity-40
				`}
			>
				<MinusIcon className="h-4 w-4" />
			</button>
			<span
				className="
					min-w-[2.5rem]
					flex-1
					text-center
					text-sm
					font-semibold
					tabular-nums
					text-ink
				"
				aria-live="polite"
			>
				{quantity}
			</span>
			<button
				type="button"
				aria-label="Increase quantity"
				disabled={busy || incrementDisabled}
				onClick={onIncrement}
				className={`
					${pad}
					rounded-full
					text-asgreen
					disabled:opacity-40
				`}
			>
				<PlusIcon className="h-4 w-4" />
			</button>
		</div>
	);
}
