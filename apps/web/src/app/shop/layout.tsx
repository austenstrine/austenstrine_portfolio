import type { ReactNode } from 'react';

export default function ShopLayout({ children }: { children: ReactNode }) {
	return (
		<div className="min-h-screen bg-frost text-ink">
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
						items-center
						justify-between
						gap-4
						px-6
						py-4
					"
				>
					<a href="/shop" className="text-lg font-semibold tracking-tight">
						Marketplace
					</a>
					<nav className="flex items-center gap-4 text-sm font-semibold">
						<a href="/shop/search" className="text-sky hover:underline">
							Search
						</a>
						<a href="/shop/vendors" className="text-sky hover:underline">
							Vendors
						</a>
						<a href="/shop/manage" className="text-sky hover:underline">
							Manage
						</a>
						<a href="/" className="text-slate-500 hover:text-ink">
							Portfolio
						</a>
					</nav>
				</div>
			</header>
			<main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
		</div>
	);
}
