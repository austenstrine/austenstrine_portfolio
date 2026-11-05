import {
	JOIN_DEMO_HREF,
	PLACE_ET_MARQUE_BLURB,
	SITE_REPO,
} from '../../lib/site';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';

const entries = [
	{
		title: 'What it is',
		href: JOIN_DEMO_HREF,
		summary:
			'A working multi-vendor marketplace: catalog search, pack/piece inventory, cart, and Stripe checkout — built as a public demo of Place et Marque.',
		cta: 'Read the intro',
	},
	{
		title: 'Join demo',
		href: JOIN_DEMO_HREF,
		summary:
			'Get invited into Demo Supply Co. the same way a real org invites a teammate: register with your email, accept membership, then explore seller tools on seeded products and orders.',
		cta: 'Join as a seller',
	},
	{
		title: 'Sign in',
		href: `/auth/login?next=${encodeURIComponent('/place-et-marque/vendors/demo-supply')}`,
		summary:
			'Already joined Demo Supply Co.? Sign in and open the seller workspace — products, orders, members, and payouts.',
		cta: 'Sign in',
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

			<ol
				className="
					mt-8
					grid
					gap-4
					md:grid-cols-3
				"
			>
				{entries.map((entry, index) => (
					<li key={`${entry.title}-${entry.href}`}>
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
							href={entry.href}
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
									gap-1
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
			</ol>

			<a
				className="
					mt-8
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
					focus-visible:outline-none
					focus-visible:ring-2
					focus-visible:ring-ink
					focus-visible:ring-offset-2
				"
				href={JOIN_DEMO_HREF}
			>
				Join the Place et Marque demo
			</a>
		</section>
	);
}
