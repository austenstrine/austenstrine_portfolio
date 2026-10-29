import { GUIDED_DEMO_PRODUCT, SITE_REPO } from '../../lib/site';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

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
				A live multi-vendor catalog: packs, pieces, units of measure, search, and
				checkout. Source is public on
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
					grid
					gap-4
					md:grid-cols-3
				"
			>
				{steps.map((step, index) => (
					<li key={step.href}>
						<a
							className="
								group
								flex
								h-full
								flex-col
								rounded-2xl
								border
								border-slate-200
								bg-frost/60
								p-5
								transition
								hover:border-ink
								hover:bg-white
								focus-visible:outline-none
								focus-visible:ring-2
								focus-visible:ring-ink
								focus-visible:ring-offset-2
							"
							href={step.href}
						>
							<span
								className="
									text-[11px]
									font-semibold
									uppercase
									tracking-[0.18em]
									text-slate-500
								"
							>
								{`Step ${index + 1}`}
							</span>
							<p
								className="
									mt-3
									text-lg
									font-semibold
									text-ink
								"
							>
								{step.title}
							</p>
							<p
								className="
									mt-2
									flex-1
									text-sm
									leading-relaxed
									text-slate-600
								"
							>
								{step.summary}
							</p>
							<span
								className="
									mt-5
									inline-flex
									items-center
									gap-1
									text-sm
									font-semibold
									text-ink
								"
							>
								Open
								<span
									aria-hidden="true"
									className="
										transition-transform
										group-hover:translate-x-0.5
									"
								>
									<ArrowRightIcon
										className="h-4 w-4"
									/>
								</span>
							</span>
						</a>
					</li>
				))}
			</ol>

			<a
				className="
					mt-8
					inline-flex
					rounded-full
					bg-ink
					px-5
					py-2.5
					text-sm
					font-semibold
					text-white
					transition
					hover:bg-sky
					focus-visible:outline-none
					focus-visible:ring-2
					focus-visible:ring-ink
					focus-visible:ring-offset-2
				"
				href="/place-et-marque"
			>
				Enter Place et Marque
			</a>
		</section>
	);
}
