import {
	JOIN_DEMO_HREF,
	PLACE_ET_MARQUE_BLURB,
	SITE_REPO,
} from '../../lib/site';
import { NavigatePersistentArrow } from '../catalog/NavigatePersistentArrow';

const CATALOG_HREF = '/place-et-marque';

const entries = [
	{
		title: 'Shop as a buyer',
		href: CATALOG_HREF,
		summary:
			'Browse the live multi-vendor catalog: search products, add packs or pieces to cart, and check out with Stripe.',
		cta: 'Open the catalog',
	},
	{
		title: 'Join as a seller',
		href: JOIN_DEMO_HREF,
		summary:
			'Get invited into Demo Supply Co. the same way a real org invites a teammate, then explore products, orders, members, and payouts.',
		cta: 'Join the seller demo',
	},
];

export function FeaturedBuildSection() {
	return (
		<section
			className="
				rounded-none
				border
				border-slate-200
				bg-white
				px-gutter
				py-8
				shadow-sm
				sm:rounded-2xl
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
				{PLACE_ET_MARQUE_BLURB}
				{' '}
				Source is public on
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

			<ul
				className="
					mt-8
					grid
					gap-5
					md:grid-cols-2
				"
			>
				{entries.map((entry) => (
					<li key={entry.href}>
						<a
							className="
								group
								flex
								h-full
								flex-col
								rounded-2xl
								border-2
								border-slate-300
								bg-white
								p-inset
								shadow-sm
								transition
								hover:border-sky
								hover:shadow-md
								focus-visible:outline-none
								focus-visible:ring-2
								focus-visible:ring-ink
								focus-visible:ring-offset-2
							"
							href={entry.href}
						>
							<p
								className="
									text-xl
									font-semibold
									text-ink
								"
							>
								{entry.title}
							</p>
							<p
								className="
									mt-3
									flex-1
									text-base
									leading-relaxed
									text-slate-600
								"
							>
								{entry.summary}
							</p>
							<span
								className="
									mt-6
									inline-flex
									items-center
									justify-center
									gap-1.5
									self-stretch
									rounded-full
									bg-sky
									px-5
									py-2.5
									text-sm
									font-semibold
									text-white
									transition
									group-hover:bg-sky/90
									max-[399px]:px-3
								"
							>
								{entry.cta}
								<NavigatePersistentArrow
									iconClassName="h-4 w-4"
								/>
							</span>
						</a>
					</li>
				))}
			</ul>
		</section>
	);
}
