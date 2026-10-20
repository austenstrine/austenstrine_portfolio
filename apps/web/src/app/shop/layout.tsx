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
						<a
							className="text-sky hover:underline"
							href="/shop/search"
						>
							Search
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/cart"
						>
							Cart
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/orders"
						>
							Orders
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/vendors"
						>
							Vendors
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/uoms"
						>
							UOMs
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/categories"
						>
							Categories
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/products/new"
						>
							New product
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/products/configure"
						>
							Inventory config
						</a>
						<a
							className="text-sky hover:underline"
							href="/shop/manage"
						>
							Manage
						</a>
						<a
							className="text-slate-500 hover:text-ink"
							href="/"
						>
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
