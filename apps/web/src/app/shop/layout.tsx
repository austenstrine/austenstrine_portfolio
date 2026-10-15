import type { ReactNode } from 'react';

export default function ShopLayout({ children }: { children: ReactNode }) {
	return (
		<div
			className="
				min-h-screen
				bg-frost
				text-ink
			"
		>
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
					<a
						className="
							text-lg
							font-semibold
							tracking-tight
						"
						href="/shop"
					>
						Marketplace
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
						<a href="/shop/start" className="text-sky hover:underline">
							Start
						</a>
						<a href="/shop/search" className="text-sky hover:underline">
							Search
						</a>
						<a href="/shop/cart" className="text-sky hover:underline">
							Cart
						</a>
						<a href="/shop/orders" className="text-sky hover:underline">
							Orders
						</a>
						<a href="/shop/vendors" className="text-sky hover:underline">
							Vendors
						</a>
						<a href="/shop/uoms" className="text-sky hover:underline">
							UOMs
						</a>
						<a href="/shop/categories" className="text-sky hover:underline">
							Categories
						</a>
						<a href="/shop/products/new" className="text-sky hover:underline">
							New product
						</a>
						<a
							href="/shop/products/configure"
							className="text-sky hover:underline"
						>
							Inventory config
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
			<main
				className="
					mx-auto
					max-w-6xl
					px-6
					py-10
				"
			>
				{children}
			</main>
		</div>
	);
}
