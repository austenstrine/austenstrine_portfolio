import { showcasePortals } from '../../lib/showcasePortals';

const REPO_URL = 'https://github.com/austenstrine/austenstrine_portfolio';

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
			<div
				className="
					flex
					flex-col
					gap-3
				"
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
						text-3xl
						font-semibold
						text-ink
					"
				>
					Live marketplace
				</h2>
				<p
					className="
						max-w-3xl
						text-slate-700
					"
				>
					The marketplace is the demonstration—real catalog, inventory, search, and checkout
					surfaces, not mocks. Source is public on{' '}
					<a
						className="
							font-semibold
							text-sky
							hover:underline
						"
						href={REPO_URL}
						rel="noreferrer"
						target="_blank"
					>
						GitHub
					</a>
					.
				</p>
			</div>

			<ul
				className="
					mt-8
					divide-y
					divide-slate-200
					border-y
					border-slate-200
				"
			>
				{showcasePortals.map((portal) => (
					<li key={portal.id}>
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
							href={portal.href}
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
									{portal.title}
								</p>
								<p
									className="
										mt-1
										text-sm
										text-slate-600
									"
								>
									{portal.summary}
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
			</ul>

			<p
				className="
					mt-6
					text-sm
					text-slate-600
				"
			>
				<a
					className="
						font-semibold
						text-sky
						hover:underline
					"
					href="/shop"
				>
					Enter the marketplace
				</a>
				{' '}
				or browse the full stack in the repository.
			</p>
		</section>
	);
}
