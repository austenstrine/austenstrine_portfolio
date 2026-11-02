import { MarketplaceBrandLink } from './MarketplaceBrandLink';

export function MarketplaceFooter() {
	return (
		<footer
			className="
				mt-auto
				border-t
				border-slate-200
				bg-white
			"
		>
			<div
				className="
					mx-auto
					flex
					max-w-7xl
					flex-col
					gap-6
					px-gutter
					py-8
					sm:flex-row
					sm:items-start
					sm:justify-between
				"
			>
				<div>
					<MarketplaceBrandLink
						nameClassName="
							text-sm
							font-semibold
						"
					/>
					<p
						className="
							mt-1
							max-w-sm
							text-sm
							text-slate-500
						"
					>
						A live multi-vendor e-commerce demo by Austen Strine.
					</p>
				</div>
				<nav
					className="
						flex
						flex-wrap
						gap-x-5
						gap-y-2
						text-sm
						font-semibold
						text-slate-600
					"
				>
					<a className="hover:text-ink" href="/place-et-marque/search">
						Shop
					</a>
					<a className="hover:text-ink" href="/place-et-marque/cart">
						Cart
					</a>
					<a className="hover:text-ink" href="/place-et-marque/guide">
						Guide
					</a>
					<a className="hover:text-ink" href="/place-et-marque/manage">
						Sell
					</a>
					<a className="hover:text-ink" href="/">
						Portfolio
					</a>
				</nav>
			</div>
		</footer>
	);
}
