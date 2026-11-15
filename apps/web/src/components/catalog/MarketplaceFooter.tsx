'use client';

import { usePathname } from 'next/navigation';
import { pathUsesSellerChrome } from '../../lib/accessGate';
import { MarketplaceBrandLink } from './MarketplaceBrandLink';
import { NavigateHoverArrow } from './NavigateHoverArrow';

const footerLinkClassName = `
	group
	inline-flex
	items-center
	px-2.5
	text-sm
	font-semibold
	text-ink
	transition-colors
	hover:text-sky
`;

function FooterNavLink({
	href,
	children,
}: {
	href: string;
	children: string;
}) {
	return (
		<a
			className={footerLinkClassName}
			href={href}
		>
			{children}
			<NavigateHoverArrow className="text-slate-400" />
		</a>
	);
}

export function MarketplaceFooter() {
	const pathname = usePathname();
	const sellerChrome = pathUsesSellerChrome(pathname);

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
						A live multi-vendor e-commerce demo.
					</p>
				</div>
				<nav
					className="
						-mx-2
						flex
						flex-wrap
						gap-y-2
						min-[400px]:-mx-2.5
					"
				>
					<FooterNavLink href="/place-et-marque/search">
						Shop
					</FooterNavLink>
					{sellerChrome
						? null
						: (
							<FooterNavLink href="/place-et-marque/cart">
								Cart
							</FooterNavLink>
						)
					}
					<FooterNavLink href="/place-et-marque/guide">
						Guide
					</FooterNavLink>
					<FooterNavLink href="/place-et-marque/roadmap">
						Roadmap
					</FooterNavLink>
					<FooterNavLink href="/place-et-marque/manage">
						Sell
					</FooterNavLink>
					<FooterNavLink href="/">
						Portfolio
					</FooterNavLink>
				</nav>
			</div>
		</footer>
	);
}
