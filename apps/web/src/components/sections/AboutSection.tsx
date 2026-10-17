import { recommendations } from '../../data/recommendations';
import type { Recommendation } from '../../data/recommendations';

function RecommendationAttribution({
	recommendation,
}: {
	recommendation: Recommendation;
}) {
	return (
		<div
			className="
				flex
				flex-col
				gap-1
				text-center
				md:text-left
			"
		>
			<a
				className="
					text-lg
					font-semibold
					text-ink
					hover:text-sky
				"
				href={recommendation.profileUrl}
				rel="noreferrer"
				target="_blank"
			>
				{recommendation.name}
			</a>
			<p
				className="
					text-sm
					text-slate-600
				"
			>
				{recommendation.headline}
			</p>
			<p
				className="
					text-xs
					font-medium
					uppercase
					tracking-wide
					text-slate-500
				"
			>
				{recommendation.relationship}
				{' · '}
				{recommendation.date}
			</p>
		</div>
	);
}

function RecommendationQuote({
	recommendation,
	featured = false,
}: {
	recommendation: Recommendation;
	featured?: boolean;
}) {
	const paragraphs = recommendation.text.split('\n').filter(Boolean);

	if(featured) {
		return (
			<blockquote
				className="
					mt-4
					space-y-3
					border-l-2
					border-sky/40
					pl-4
					text-base
					leading-relaxed
					text-slate-700
				"
			>
				{
					paragraphs.map((paragraph) => (
						<p key={paragraph.slice(0, 48)}>
							{paragraph}
						</p>
					))
				}
			</blockquote>
		);
	}

	return (
		<blockquote
			className="
				mt-4
				space-y-3
				border-l-2
				border-sky/40
				pl-4
				text-sm
				leading-relaxed
				text-slate-700
			"
		>
			{
				paragraphs.map((paragraph) => (
					<p key={paragraph.slice(0, 48)}>
						{paragraph}
					</p>
				))
			}
		</blockquote>
	);
}

function FeaturedRecommendation({
	recommendation,
}: {
	recommendation: Recommendation;
}) {
	return (
		<article
			className="
				rounded-2xl
				border
				border-slate-100
				bg-frost/60
				p-5
				md:col-span-2
				md:p-6
			"
		>
			<div
				className="
					flex
					flex-col
					gap-5
					md:grid
					md:grid-cols-[auto,1fr]
					md:items-start
					md:gap-8
				"
			>
				<a
					className="
						mx-auto
						shrink-0
						md:mx-0
					"
					href={recommendation.profileUrl}
					rel="noreferrer"
					target="_blank"
				>
					<img
						alt={recommendation.name}
						className="
							h-28
							w-28
							rounded-full
							border-4
							border-white
							object-cover
							shadow-md
						"
						src={recommendation.image}
					/>
				</a>

				<div>
					<RecommendationAttribution recommendation={recommendation} />
					<RecommendationQuote
						featured
						recommendation={recommendation}
					/>
				</div>
			</div>
		</article>
	);
}

function SupportingRecommendation({
	recommendation,
}: {
	recommendation: Recommendation;
}) {
	return (
		<article
			className="
				rounded-2xl
				border
				border-slate-100
				bg-frost/60
				p-5
				md:p-6
			"
		>
			<div
				className="
					flex
					flex-col
					gap-4
				"
			>
				<a
					className="
						mx-auto
						shrink-0
						md:mx-0
					"
					href={recommendation.profileUrl}
					rel="noreferrer"
					target="_blank"
				>
					<img
						alt={recommendation.name}
						className="
							h-20
							w-20
							rounded-full
							border-4
							border-white
							object-cover
							shadow-md
						"
						src={recommendation.image}
					/>
				</a>

				<div>
					<RecommendationAttribution recommendation={recommendation} />
					<RecommendationQuote recommendation={recommendation} />
				</div>
			</div>
		</article>
	);
}

export function AboutSection() {
	const [featured, ...rest] = recommendations;

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
			id="about"
		>
			<div
				className="
					max-w-3xl
				"
			>
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.18em]
						text-sky
					"
				>
					Recommendations
				</p>
				<h2
					className="
						mt-2
						text-3xl
						font-semibold
						text-ink
					"
				>
					What colleagues say
				</h2>
				<p
					className="
						mt-3
						text-slate-600
					"
				>
					I&apos;d rather let people I&apos;ve worked with speak. These are LinkedIn
					recommendations from managers and peers.
				</p>
			</div>

			<div
				className="
					mt-8
					grid
					gap-6
					md:grid-cols-2
				"
			>
				{
					featured
						? (
							<FeaturedRecommendation recommendation={featured} />
						)
						: null
				}
				{
					rest.map((recommendation) => (
						<SupportingRecommendation
							key={recommendation.profileUrl}
							recommendation={recommendation}
						/>
					))
				}
			</div>
		</section>
	);
}
