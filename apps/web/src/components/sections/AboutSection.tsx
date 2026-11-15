import { recommendations } from '../../data/recommendations';
import type { Recommendation } from '../../data/recommendations';
import { CdnImg } from '../CdnImg';
import { ExternalHoverIcon } from '../ExternalHoverIcon';
import { ExternalLinkIcon } from '../icons/ExternalLinkIcon';

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
					group
					inline-flex
					items-center
					justify-center
					text-lg
					font-semibold
					text-ink
					transition
					hover:text-sky
					md:justify-start
				"
				href={recommendation.profileUrl}
				rel="noreferrer"
				target="_blank"
			>
				{recommendation.name}
				<ExternalHoverIcon className="text-slate-400" />
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
}: {
	recommendation: Recommendation;
}) {
	const paragraphs = recommendation.text.split('\n').filter(Boolean);

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

function RecommendationPhotoLink({
	recommendation,
	size,
}: {
	recommendation: Recommendation;
	size: 'featured' | 'supporting';}) {
	const pixels = size === 'featured'
		? 112
		: 80;
	const cdnEdge = pixels * 2;

	return (
		<a
			aria-label={`${recommendation.name} on LinkedIn (opens in a new tab)`}
			className="
				group
				relative
				mx-auto
				block
				shrink-0
				md:mx-0
			"
			href={recommendation.profileUrl}
			rel="noreferrer"
			target="_blank"
		>
			<CdnImg
				className={
					`
						rounded-full
						border-4
						border-white
						object-cover
						shadow-md
						${size === 'featured'
							? 'h-28 w-28'
							: 'h-20 w-20'
						}
					`.trim()
				}
				alt={recommendation.name}
				src={recommendation.image}
				cdn={{ w: cdnEdge, h: cdnEdge, fit: 'cover', fm: 'webp' }}
				width={pixels}
				height={pixels}
			/>
			<span
				aria-hidden
				className="
					pointer-events-none
					absolute
					bottom-0.5
					right-0.5
					inline-flex
					items-center
					justify-center
					rounded-full
					border
					border-slate-200
					bg-white
					p-1
					text-sky
					shadow-sm
					opacity-100
					transition-opacity
					duration-200
					ease-out
					motion-reduce:transition-none
					lg:opacity-0
					group-focus-visible:opacity-100
					[@media(hover:hover)]:lg:group-hover:opacity-100
				"
			>
				<ExternalLinkIcon
					className="
						h-3
						w-3
						shrink-0
					"
				/>
			</span>
		</a>
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
				p-inset
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
				<RecommendationPhotoLink
					recommendation={recommendation}
					size="featured"
				/>

				<div>
					<RecommendationAttribution
						recommendation={recommendation}
					/>
					<RecommendationQuote
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
				p-inset
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
				<RecommendationPhotoLink
					recommendation={recommendation}
					size="supporting"
				/>

				<div>
					<RecommendationAttribution
						recommendation={recommendation}
					/>
					<RecommendationQuote
						recommendation={recommendation}
					/>
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
				rounded-none
				border
				border-slate-200
				bg-white
				px-gutter
				py-8
				shadow-sm
				sm:rounded-2xl
				sm:p-8
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
					From managers and peers at Lumber Marketplace and GO Green.
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
							<FeaturedRecommendation
								recommendation={featured}
							/>
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
