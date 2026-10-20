import type { ReactNode } from 'react';
import { SessionNav } from '../../components/auth/SessionNav';

export default function PlaceEtMarqueLayout({ children }: { children: ReactNode }) {
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
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/search"
						>
							Search
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/cart"
						>
							Cart
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/orders"
						>
							Orders
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/vendors"
						>
							Vendors
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/uoms"
						>
							UOMs
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/categories"
						>
							Categories
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/products/new"
						>
							New product
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/products/configure"
						>
							Inventory config
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/manage"
						>
							Manage
						</a>
						<a
							className="text-sky hover:underline"
							href="/place-et-marque/guide"
						>
							Guide
						</a>
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
