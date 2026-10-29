import { GUIDED_DEMO_PRODUCT } from '../../lib/site';

export function DemoIntro() {
	return (
		<section
			className="
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-6
			"
		>
			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				Place et Marque
			</h1>
			<p
				className="
					mt-3
					max-w-3xl
					text-slate-700
				"
			>
				A live multi-vendor catalog: search, pack and piece units, vendor tools, and
				checkout. Sign in to add items to a cart.
			</p>
			<ol
				className="
					mt-5
					grid
					gap-3
					text-sm
					md:grid-cols-3
				"
			>
				<li
					className="
						rounded-xl
						border
						border-slate-100
						bg-frost/60
						p-4
					"
				>
					<p className="font-semibold text-ink">
						1. Search
					</p>
					<p className="mt-1 text-slate-600">
						<a className="font-semibold text-sky hover:underline" href="/place-et-marque/search">
							Open search
						</a>
						{' '}
						and try a term like wire or television.
					</p>
				</li>
				<li
					className="
						rounded-xl
						border
						border-slate-100
						bg-frost/60
						p-4
					"
				>
					<p className="font-semibold text-ink">
						2. A wire listing
					</p>
					<p className="mt-1 text-slate-600">
						<a
							className="font-semibold text-sky hover:underline"
							href={GUIDED_DEMO_PRODUCT.href}
						>
							{GUIDED_DEMO_PRODUCT.title}
						</a>
						{' — '}
						{GUIDED_DEMO_PRODUCT.summary}
					</p>
				</li>
				<li
					className="
						rounded-xl
						border
						border-slate-100
						bg-frost/60
						p-4
					"
				>
					<p className="font-semibold text-ink">
						3. Cart
					</p>
					<p className="mt-1 text-slate-600">
						<a className="font-semibold text-sky hover:underline" href="/auth/login">
							Sign in
						</a>
						{' '}
						to add items, then check out with Stripe.
					</p>
				</li>
			</ol>
		</section>
	);
}
