import { GUIDED_DEMO_PRODUCT, SITE_REPO } from '../../lib/site';

const steps = [
	{
		title: 'Search',
		href: '/place-et-marque/search',
		summary: 'Catalog search with category, vendor, and attribute filters.',
	},
	{
		title: GUIDED_DEMO_PRODUCT.title,
		href: GUIDED_DEMO_PRODUCT.href,
		summary: GUIDED_DEMO_PRODUCT.summary,
	},
	{
		title: 'Cart',
		href: '/place-et-marque/cart',
		summary: 'Sign in to add items, then check out with Stripe.',
	},
];

export function FeaturedBuildSection() {
	return (
		<section
			className="
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-8
				shadow-sm
			"
			id="featured-build"
		>
			<p
				className="
					text-xs
					font-semibold
					uppercase
					tracking-[0.22em]
					text-sky
				"
			>
				Featured build
			</p>
			<h2
				className="
					mt-2
					text-3xl
					font-semibold
					text-ink
				"
			>
				Place et Marque
			</h2>
			<p
				className="
					mt-3
					max-w-3xl
					text-slate-700
				"
			>
				A live multi-vendor catalog I designed and built: packs, pieces, units of
				measure, search, and checkout. Source is public on
				{' '}
				<a
					className="font-semibold text-sky hover:underline"
					href={SITE_REPO}
					rel="noreferrer"
					target="_blank"
				>
					GitHub
				</a>.
			</p>

			<ol
				className="
					mt-8
					divide-y
					divide-slate-200
					border-y
					border-slate-200
				"
			>
				{steps.map((step, index) => (
					<li key={step.href}>
						<a
							className="
								group
								flex
								flex-col
								gap-1
								py-4
								transition
								hover:bg-slate-50
								sm:flex-row
								sm:items-baseline
								sm:justify-between
								sm:gap-6
							"
							href={step.href}
						>
							<div className="min-w-0">
								<p
									className="
										text-base
										font-semibold
										text-ink
										group-hover:text-sky
									"
								>
									{`${index + 1}. ${step.title}`}
								</p>
								<p
									className="
										mt-1
										text-sm
										text-slate-600
									"
								>
									{step.summary}
								</p>
							</div>
							<span
								className="
									shrink-0
									text-sm
									font-semibold
									text-sky
								"
							>
								Open →
							</span>
						</a>
					</li>
				))}
			</ol>

			<p
				className="
					mt-6
					text-sm
					text-slate-600
				"
			>
				<a
					className="font-semibold text-sky hover:underline"
					href="/place-et-marque"
				>
					Enter Place et Marque
				</a>
			</p>
		</section>
	);
}
