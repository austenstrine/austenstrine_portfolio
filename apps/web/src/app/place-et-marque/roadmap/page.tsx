import { RoadmapCompletedSections } from '../../../components/catalog/RoadmapCompletedSections';
import { RoadmapSuggestionForm } from '../../../components/catalog/RoadmapSuggestionForm';
import {
	ROADMAP_PLANNED,
	completedByArea,
	completedHighlights,
} from '../../../data/place-et-marque-roadmap';

const sectionNav = [
	{ id: 'planned', label: 'Planned' },
	{ id: 'completed', label: 'Completed' },
	{ id: 'suggestions', label: 'Suggestions' },
] as const;

/** Clear sticky catalog header (+ any top banners baked into the token). */
const sectionScrollClassName = `
	scroll-mt-[calc(var(--catalog-header-h)+0.75rem)]
	flex
	flex-col
	gap-4
`;

export default function PlaceEtMarqueRoadmapPage() {
	const completedGroups = completedByArea();
	const highlights = completedHighlights();

	return (
		<div
			className="
				relative
				flex
				flex-col
				gap-10
				pb-16
			"
		>
			<header
				className="
					max-w-3xl
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
					Pardon our dust
				</p>
				<h1
					className="
						mt-2
						text-3xl
						font-semibold
						tracking-tight
						md:text-4xl
					"
				>
					Roadmap
				</h1>
				<p
					className="
						mt-3
						text-base
						leading-relaxed
						text-slate-700
					"
				>
					Place et Marque is live while we keep building. Here is what is
					still rough, what has already landed, and a place to send ideas.
				</p>
			</header>

			<nav
				aria-label="Roadmap sections"
				className="
					flex
					flex-wrap
					gap-x-1
					gap-y-1
					text-sm
					font-semibold
				"
			>
				{sectionNav.map((item) => (
					<a
						className="
							inline-flex
							min-h-11
							items-center
							px-3
							text-sky
							underline
							underline-offset-2
							max-[399px]:px-2
						"
						key={item.id}
						href={`#${item.id}`}
					>
						{item.label}
					</a>
				))}
			</nav>

			<section
				className={sectionScrollClassName}
				id="planned"
			>
				<div>
					<h2
						className="
							text-xl
							font-semibold
							tracking-tight
						"
					>
						Planned / known issues
					</h2>
					<p
						className="
							mt-1
							max-w-2xl
							text-sm
							text-slate-600
						"
					>
						Active refine work and rough edges we already know about.
					</p>
				</div>
				<ul
					className="
						flex
						flex-col
						gap-3
					"
				>
					{ROADMAP_PLANNED.map((item) => (
						<li
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
							key={item.id}
						>
							<div
								className="
									flex
									flex-wrap
									items-baseline
									justify-between
									gap-2
								"
							>
								<h3 className="text-base font-semibold">
									{item.title}
								</h3>
								<span
									className="
										text-xs
										font-semibold
										uppercase
										tracking-[0.12em]
										text-slate-500
									"
								>
									{item.status === 'known-issue'
										? 'Known issue'
										: 'Planned'
									}
								</span>
							</div>
							{item.summary
								? (
										<p
											className="
												mt-2
												text-sm
												leading-relaxed
												text-slate-600
											"
										>
											{item.summary}
										</p>
									)
								: null
							}
						</li>
					))}
				</ul>
			</section>

			<section
				className={`
					${sectionScrollClassName}
					gap-6
				`}
				id="completed"
			>
				<div>
					<h2
						className="
							text-xl
							font-semibold
							tracking-tight
						"
					>
						Completed
					</h2>
					<p
						className="
							mt-1
							max-w-2xl
							text-sm
							text-slate-600
						"
					>
						Highlights first, then the full list by area — open an
						area to see everything that has landed.
					</p>
				</div>

				<RoadmapCompletedSections
					groups={completedGroups}
					highlights={highlights}
				/>
			</section>

			<section
				className={`
					${sectionScrollClassName}
					max-w-2xl
					rounded-2xl
					border
					border-slate-200
					bg-white
					p-5
					sm:p-6
				`}
				id="suggestions"
			>
				<h2
					className="
						text-xl
						font-semibold
						tracking-tight
					"
				>
					Suggestions
				</h2>
				<p
					className="
						mt-2
						text-sm
						leading-relaxed
						text-slate-600
					"
				>
					Signed in or not — send a short idea. We rate-limit submissions
					and ignore obvious spam.
				</p>
				<div className="mt-5">
					<RoadmapSuggestionForm />
				</div>
			</section>
		</div>
	);
}
