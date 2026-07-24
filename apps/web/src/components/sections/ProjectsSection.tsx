
"use client";

import { useRef, useState } from 'react';

type HighlightFeature = {
	id: string;
	label: string;
	title: string;
	summary: string;
	detail: string;
	targetSelector: string;
	codeHref: string;
	codeLabel: string;
	notes: string[];
};

const features: HighlightFeature[] = [
	{
		id: 'contact-ux',
		label: 'Micro-interaction',
		title: 'Contact UX That Rewards Curiosity',
		summary: 'Jump to the contact section and try the copy flows, hover behavior, and shared toast feedback.',
		detail: 'This part of the site demonstrates product-minded frontend work: the interaction is simple, but the hover states, mobile behavior, and confirmation feedback were tuned to feel deliberate instead of decorative.',
		targetSelector: '#contact',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections',
		codeLabel: 'View contact components',
		notes: [
			'Responsive hover versus always-visible affordances',
			'Universal toast feedback instead of repeated inline popups',
			'Copy targets designed to feel integrated, not widget-like',
		],
	},
	{
		id: 'about-layout',
		label: 'Responsive layout',
		title: 'Desktop Stickiness With Mobile Reading Flow',
		summary: 'Scroll to About Me to see the portrait hold visual weight on desktop without disrupting mobile reading order.',
		detail: 'The layout shifts by intent rather than by accident. On larger screens, the portrait acts as a stable visual anchor while the text scrolls. On mobile, the reading order stays clean: header, body, then image.',
		targetSelector: '#about',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections/AboutSection.tsx',
		codeLabel: 'View layout implementation',
		notes: [
			'Sticky positioning constrained by the section container',
			'Different DOM and layout concerns handled without breaking mobile flow',
			'Reading rhythm prioritized over decorative balance',
		],
	},
	{
		id: 'skills-rhythm',
		label: 'Visual system',
		title: 'Section Rhythm Over Arbitrary Variation',
		summary: 'Jump to Skills & Expertise to see how hierarchy is created with internal contrast instead of a one-off section background.',
		detail: 'This section shows the design principle used across the site: neutral outer shells for content sections, stronger accent treatments only where emphasis is deserved, and local contrast inside cards rather than random palette shifts.',
		targetSelector: '#skills',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections/SkillsSection.tsx',
		codeLabel: 'View section styling',
		notes: [
			'Consistent section treatment across the page',
			'Contrast pushed down into cards instead of outer wrappers',
			'Cleaner visual hierarchy with fewer competing surfaces',
		],
	},
	{
		id: 'cv-flow',
		label: 'Conversion path',
		title: 'CV Access Built Into The Live Experience',
		summary: 'Jump directly to the CV row in contact and use the live site as the entry point into the printable artifact.',
		detail: 'Rather than treating the resume as a disconnected file, the site makes it part of the interaction model. Visitors can explore the live experience, then pivot straight into a printable CV when they want a more conventional artifact.',
		targetSelector: '#contact-cv-row',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/blob/master_nestjs/cv.html',
		codeLabel: 'View CV artifact',
		notes: [
			'Live portfolio and printable resume support each other',
			'Interaction stays within the page until the user chooses otherwise',
			'Useful for both recruiters and technical reviewers',
		],
	},
	{
		id: 'full-stack-foundation',
		label: 'Architecture',
		title: 'This Portfolio Is Backed By Real Application Structure',
		summary: 'Focus the implementation panel to see the stack used to support the site and the features still being added.',
		detail: 'The portfolio is not being treated as a static brochure. It is being rebuilt as a real product surface with a Next.js frontend, a NestJS API, and room for authenticated workflows, search, and inventory tooling as those features come online.',
		targetSelector: '#featured-build-stack',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/api',
		codeLabel: 'View API source',
		notes: [
			'Next.js app-router frontend in the same repo as the API',
			'NestJS, Prisma, Redis, and OpenSearch scaffolding already in place',
			'Built to absorb login, search, inventory, and admin workflows',
		],
	},
];

export function ProjectsSection() {
	const [activeFeatureId, setActiveFeatureId] = useState(features[0].id);
	const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const activeFeature = features.find((feature) => feature.id === activeFeatureId) ?? features[0];

	const runFeature = (feature: HighlightFeature) => {
		setActiveFeatureId(feature.id);

		const target = document.querySelector<HTMLElement>(feature.targetSelector);

		if (!target) {
			return;
		}

		target.scrollIntoView({
			behavior: 'smooth',
			block: 'center',
		});

		target.classList.remove('tour-target-active');
		void target.offsetWidth;
		target.classList.add('tour-target-active');

		if (highlightTimeoutRef.current) {
			clearTimeout(highlightTimeoutRef.current);
		}

		highlightTimeoutRef.current = setTimeout(() => {
			target.classList.remove('tour-target-active');
			highlightTimeoutRef.current = null;
		}, 1600);
	};

	return (
		<section
			id="featured-build"
			className="
				rounded-2xl
				border
				border-slate-200
				bg-white
				p-8
				shadow-sm
			"
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
					Featured Build
				</p>
				<h2
					className="
						text-3xl
						font-semibold
						text-ink
					"
				>
					This Site Is The Project Showcase
				</h2>
				<p
					className="
						max-w-3xl
						text-slate-700
					"
				>
					Most of my professional work lives behind private repositories and proprietary constraints.
					This portfolio is being built as a live case study:
					a real product surface that demonstrates interaction design, layout decisions, and the
					full-stack foundation behind upcoming features.
				</p>
			</div>

			<div
				className="
					mt-6
					grid
					gap-6
					lg:grid-cols-[minmax(0,1.15fr),minmax(320px,0.85fr)]
				"
			>
				<div className="grid gap-4">
					{
						features.map((feature) => {
							const isActive = feature.id === activeFeature.id;

							return (
								<article
									key={feature.id}
									className="
										rounded-xl
										border
										border-slate-200
										bg-slate-50
										p-5
									"
								>
									<div
										className="
											flex
											items-start
											justify-between
											gap-4
										"
									>
										<div>
											<p
												className="
													text-[11px]
													font-semibold
													uppercase
													tracking-[0.18em]
													text-slate-500
												"
											>
												{feature.label}
											</p>
											<h3
												className="
													mt-1
													text-lg
													font-semibold
													text-ink
												"
											>
												{feature.title}
											</h3>
										</div>
										<span
											className={
												(isActive
													? 'rounded-full bg-sky px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white'
													: 'rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500'
												)
											}
										>
											{isActive
												? 'Active'
												: 'Tour'}
										</span>
									</div>
									<p
										className="
											mt-3
											text-sm
											text-slate-700
										"
									>
										{feature.summary}
									</p>
									<div
										className="
											mt-4
											flex
											flex-wrap
											gap-3
										"
									>
										<button
											type="button"
											onClick={() => runFeature(feature)}
											className="
												rounded-full
												bg-ink
												px-4
												py-2
												text-sm
												font-semibold
												text-white
												transition
												hover:-translate-y-0.5
												hover:bg-sky
											"
										>
											Try it live
										</button>
										<a
											href={feature.codeHref}
											target="_blank"
											rel="noreferrer"
											className="
												inline-flex
												items-center
												rounded-full
												border
												border-slate-300
												px-4
												py-2
												text-sm
												font-semibold
												text-slate-700
												transition
												hover:border-sky
												hover:text-sky
											"
										>
											{feature.codeLabel}
										</a>
									</div>
								</article>
							);
						})
					}
				</div>

				<div
					className="
						lg:sticky
						lg:top-6
						lg:self-start
					"
				>
					<div
						className="
							rounded-2xl
							bg-gradient-to-br
							from-ink
							via-sky
							to-emerald-800
							p-6
							text-white
							shadow-xl
						"
					>
						<p
							className="
								text-xs
								font-semibold
								uppercase
								tracking-[0.22em]
								text-slate-100
							"
						>
							Current highlight
						</p>
						<h3
							className="
								mt-3
								text-2xl
								font-semibold
							"
						>
							{activeFeature.title}
						</h3>
						<p
							className="
								mt-3
								text-sm
								leading-6
								text-slate-100
							"
						>
							{activeFeature.detail}
						</p>
						<div
							id="featured-build-stack"
							className="
								mt-5
								rounded-xl
								border
								border-white/20
								bg-white/10
								p-4
							"
						>
							<p
								className="
									text-[11px]
									font-semibold
									uppercase
									tracking-[0.18em]
									text-slate-100
								"
							>
								Stack and direction
							</p>
							<div
								className="
									mt-3
									flex
									flex-wrap
									gap-2
								"
							>
								{
									['Next.js', 'NestJS', 'Prisma', 'Redis', 'OpenSearch', 'Docker'].map((item) => (
										<span
											key={item}
											className="
												rounded-full
												bg-white/15
												px-3
												py-1
												text-xs
												font-medium
												text-white
											"
										>
											{item}
										</span>
									))
								}
							</div>
						</div>
						<div className="mt-5 space-y-2 text-sm text-slate-100">
							{
								activeFeature.notes.map((note) => (
									<p key={note}>
										{note}
									</p>
								))
							}
						</div>
						<div
							className="
								mt-6
								flex
								flex-wrap
								gap-3
							"
						>
							<a
								href="https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web"
								target="_blank"
								rel="noreferrer"
								className="
									rounded-full
									bg-white
									px-4
									py-2
									text-sm
									font-semibold
									text-ink
									transition
									hover:-translate-y-0.5
									hover:bg-frost
								"
							>
								Frontend code
							</a>
							<a
								href="https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/api"
								target="_blank"
								rel="noreferrer"
								className="
									rounded-full
									border
									border-white/30
									px-4
									py-2
									text-sm
									font-semibold
									text-white
									transition
									hover:bg-white/10
								"
							>
								API code
							</a>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
