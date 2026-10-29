'use client';

import { useSession } from '../../lib/useSession';
import { SessionNav } from '../auth/SessionNav';

const visitorLinks = [
	{ href: '/place-et-marque', label: 'Catalog' },
	{ href: '/place-et-marque/search', label: 'Search' },
	{ href: '/place-et-marque/guide', label: 'Guide' },
	{ href: '/place-et-marque/cart', label: 'Cart' },
];

const signedInLinks = [
	{ href: '/place-et-marque/orders', label: 'Orders' },
];

const vendorToolLinks = [
	{ href: '/place-et-marque/vendors', label: 'Vendors' },
	{ href: '/place-et-marque/manage', label: 'Manage' },
	{ href: '/place-et-marque/products/new', label: 'New product' },
	{ href: '/place-et-marque/products/configure', label: 'Advanced product' },
	{ href: '/place-et-marque/uoms', label: 'UOMs' },
	{ href: '/place-et-marque/attributes', label: 'Attributes' },
	{ href: '/place-et-marque/categories', label: 'Categories' },
];

export function CatalogHeader() {
	const { user, loading } = useSession();

	return (
		<header
			className="
				border-b
				border-slate-200
				bg-white
			"
		>
			<div
				className="
					mx-auto
					flex
					max-w-6xl
					flex-col
					gap-4
					px-6
					py-4
					lg:flex-row
					lg:items-center
					lg:justify-between
				"
			>
				<a
					className="
						text-lg
						font-semibold
						tracking-tight
					"
					href="/place-et-marque"
				>
					Place et Marque
				</a>
				<nav
					className="
						flex
						flex-wrap
						items-center
						gap-4
						text-sm
						font-semibold
					"
				>
					{visitorLinks.map((link) => (
						<a
							className="text-sky hover:underline"
							href={link.href}
							key={link.href}
						>
							{link.label}
						</a>
					))}
					{!loading && user
						? signedInLinks.map((link) => (
							<a
								className="text-sky hover:underline"
								href={link.href}
								key={link.href}
							>
								{link.label}
							</a>
						))
						: null}
					{!loading && user
						? (
							<details className="relative">
								<summary
									className="
										cursor-pointer
										list-none
										text-sky
										hover:underline
									"
								>
									Vendor tools
								</summary>
								<div
									className="
										absolute
										left-0
										z-20
										mt-2
										min-w-[12rem]
										rounded-xl
										border
										border-slate-200
										bg-white
										p-3
										shadow-lg
									"
								>
									<ul className="flex flex-col gap-2">
										{vendorToolLinks.map((link) => (
											<li key={link.href}>
												<a
													className="text-sky hover:underline"
													href={link.href}
												>
													{link.label}
												</a>
											</li>
										))}
									</ul>
								</div>
							</details>
						)
						: null}
					<a
						className="text-slate-500 hover:text-ink"
						href="/"
					>
						Portfolio
					</a>
					<SessionNav />
				</nav>
			</div>
		</header>
	);
}
