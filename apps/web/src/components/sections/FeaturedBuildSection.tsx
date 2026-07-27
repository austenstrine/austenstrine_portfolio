"use client";

import { useRef, useState } from 'react';
import {
	features,
	highlightTourActivateEvent,
	type HighlightFeature,
} from '../../lib/highlightTour';

export function FeaturedBuildSection() {
	const [activeFeatureId, setActiveFeatureId] = useState(features[0].id);
	const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const runFeature = (feature: HighlightFeature) => {
		setActiveFeatureId(feature.id);
		window.dispatchEvent(
			new CustomEvent(highlightTourActivateEvent, {
				detail: { featureId: feature.id },
			}),
		);

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
					gap-4
				"
			>
				{
					features.map((feature) => {
						const isActive = feature.id === activeFeatureId;

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
		</section>
	);
}
