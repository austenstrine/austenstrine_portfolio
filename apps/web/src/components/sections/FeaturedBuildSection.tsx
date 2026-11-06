import {
	JOIN_DEMO_HREF,
	PLACE_ET_MARQUE_BLURB,
	SITE_REPO,
} from '../../lib/site';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

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
					gap-4
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
								border
								border-slate-200
								bg-frost/60
								p-inset
								transition
								hover:border-ink
								hover:bg-white
								focus-visible:outline-none
								focus-visible:ring-2
								focus-visible:ring-ink
								focus-visible:ring-offset-2
							"
							href={entry.href}
						>
							<p
								className="
									text-lg
									font-semibold
									text-ink
								"
							>
								{entry.title}
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
								{entry.summary}
							</p>
							<span
								className="
									mt-5
									inline-flex
									items-center
									justify-end
									gap-1
									self-end
									text-sm
									font-semibold
									text-ink
								"
							>
								{entry.cta}
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
			</ul>

			<div
				className="
					mt-8
					flex
					justify-end
				"
			>
				<a
					className="
						inline-flex
						rounded-full
						bg-sky
						px-5
						py-2.5
						text-sm
						font-semibold
						text-white
						transition
						hover:bg-sky/90
						max-[399px]:px-3
						focus-visible:outline-none
						focus-visible:ring-2
						focus-visible:ring-ink
						focus-visible:ring-offset-2
					"
					href={JOIN_DEMO_HREF}
				>
					Join the Place et Marque demo
				</a>
			</div>
		</section>
	);
}
