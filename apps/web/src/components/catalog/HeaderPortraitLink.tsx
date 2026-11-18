import type { ReactNode } from 'react';
import { CdnImg } from '../CdnImg';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { SITE_NAME, SITE_OG_IMAGE } from '../../lib/site';

/** Portfolio home — apex without www, as specified for this peek link. */
const PORTFOLIO_HOME = 'https://austenstrine.dev/';

/**
 * Hidden portfolio peek beside the Place et Marque mark.
 *
 * Two-stage hover (fine pointer / `@media (hover: hover)` only):
 * 1. Transparent edge hit (viewport left + top through ~2rem into the PeM
 *    mark) or the brand itself → reveal only the right-most ~25% of the
 *    shared peek box (portrait sliver).
 * 2. Hovering that shared box (sliver → full content) slides it fully out;
 *    hovering anywhere on the box keeps the full reveal so it does not snap
 *    shut on small pointer moves.
 *
 * End state still shows back arrow + icon mid-left of the mark with
 * “Portfolio” under; click opens the portfolio site. The edge pad is
 * clickthrough for the brand link above it. Keyboard focus-within opens
 * the full peek.
 */
export function HeaderPortraitLink({ children }: { children: ReactNode }) {
	return (
		<div
			className="
				group/edge
				relative
				inline-flex
				items-center
				self-stretch
			"
		>
			{/*
			  Stage-1 hit: viewport/header left + top py through PeM mark
			  (~2rem). Does not own clicks — brand stays above at z-[2].
			*/}
			<div
				aria-hidden
				className="
					absolute
					-top-3
					bottom-0
					left-[calc(-1*(max(0px,(100vw-80rem)/2)+var(--gutter)))]
					z-[1]
					w-[calc(max(0px,(100vw-80rem)/2)+var(--gutter)+2rem)]
				"
				data-peek-edge
			/>
			{/*
			  Outer: stage-1 slide (−100% → −75% = right-most 25% visible).
			  Inner shared box: stage-2 hover adds +75% so net translate is 0
			  (full reveal) without fighting the outer group-hover transform.
			*/}
			<div
				className="
					absolute
					right-full
					top-1/2
					z-10
					mr-1.5
					-translate-x-full
					-translate-y-1/2
					opacity-0
					pointer-events-none
					transition-[transform,opacity]
					duration-300
					ease-out
					motion-reduce:transition-none
					[@media(hover:hover)]:group-hover/edge:pointer-events-auto
					[@media(hover:hover)]:group-hover/edge:-translate-x-[75%]
					[@media(hover:hover)]:group-hover/edge:opacity-100
					focus-within:pointer-events-auto
					focus-within:translate-x-0
					focus-within:opacity-100
				"
			>
				<div
					className="
						translate-x-0
						transition-transform
						duration-300
						ease-out
						motion-reduce:transition-none
						[@media(hover:hover)]:hover:translate-x-[75%]
					"
					data-peek-box
				>
					<a
						aria-label={`${SITE_NAME} — austenstrine.dev`}
						className="
							flex
							items-center
							gap-1
							outline-none
						"
						href={PORTFOLIO_HOME}
						rel="noopener noreferrer"
						title={`${SITE_NAME} — austenstrine.dev`}
					>
						<ArrowLeftIcon
							className="
								h-4
								w-4
								shrink-0
								text-ink
							"
						/>
						<span className="relative block size-10 shrink-0">
							<CdnImg
								alt=""
								cdn={{ w: 80, h: 80, fit: 'cover', fm: 'webp' }}
								className="
									size-10
									max-w-none
									rounded-full
									border
									border-white/80
									object-cover
									shadow-sm
								"
								height={40}
								src={SITE_OG_IMAGE}
								width={40}
							/>
							<span
								className="
									absolute
									left-1/2
									top-full
									mt-0.5
									-translate-x-1/2
									whitespace-nowrap
									text-[10px]
									font-semibold
									leading-tight
									tracking-tight
									text-ink
								"
							>
								Portfolio
							</span>
						</span>
					</a>
				</div>
			</div>
			<div
				className="
					relative
					z-[2]
					inline-flex
					items-center
				"
				data-peek-brand
			>
				{children}
			</div>
		</div>
	);
}
