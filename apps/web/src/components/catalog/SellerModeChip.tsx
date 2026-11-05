/** Discrete top-bar cue that the current route uses seller chrome (not shopper). */
export function SellerModeChip() {
	return (
		<span
			aria-label="Seller mode"
			className="
				inline-flex
				shrink-0
				items-center
				rounded-full
				border
				border-sky/25
				bg-sky/5
				px-2.5
				py-1
				text-[11px]
				font-semibold
				uppercase
				tracking-[0.14em]
				text-sky
			"
			title="You are in seller tools, not the shopper catalog"
		>
			Selling
		</span>
	);
}
