import { MarketplaceBrandLink } from '../catalog/MarketplaceBrandLink';

/**
 * Lean leave-auth chrome for guest PeM auth routes. Brand mark is the escape
 * back to the shop (same job CatalogHeader authGuest used to do). No cart,
 * category bar, or SessionProvider — cookies + hard remount seed the shop.
 */
export function AuthGuestChrome() {
	return (
		<header
			className="
				border-b
				border-slate-200
				bg-white/95
				backdrop-blur
			"
		>
			<div
				className="
					mx-auto
					flex
					max-w-7xl
					items-center
					px-gutter
					py-3
				"
			>
				<MarketplaceBrandLink />
			</div>
		</header>
	);
}
