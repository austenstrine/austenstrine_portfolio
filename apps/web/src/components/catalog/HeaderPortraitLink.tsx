import type { ReactNode } from 'react';
import { CdnImg } from '../CdnImg';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { SITE_NAME, SITE_OG_IMAGE } from '../../lib/site';

/** Portfolio home — apex without www, as specified for this peek link. */
const PORTFOLIO_HOME = 'https://austenstrine.dev/';

/**
 * Hidden portfolio peek beside the Place et Marque mark.
 * A transparent hover pad spans the first header row from the top and left
 * edges through the PeM logo (not logo-only). Hovering that pad, the brand,
 * or the peek reveals Austen’s photo middled to the left of the mark (back
 * arrow left of the icon, “Portfolio” underneath); click opens the portfolio
 * site. The pad is clickthrough for the brand link beneath.
 */
export function HeaderPortraitLink({ children }: { children: ReactNode }) {
	return (
		<div
			className="
				group/peek
				relative
				inline-flex
				items-center
				self-stretch
			"
		>
			{/*
			  Hover-only pad: viewport/header left + top py through PeM mark
			  (2rem). Does not own clicks — brand stays above at z-[2].
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
			/>
			<a
				aria-label={`${SITE_NAME} — austenstrine.dev`}
				className="
					pointer-events-none
					absolute
					right-full
					top-1/2
					z-10
					mr-1.5
					flex
					-translate-x-2
					-translate-y-1/2
					items-center
					gap-1
					opacity-0
					outline-none
					transition-[transform,opacity]
					duration-300
					ease-out
					group-hover/peek:pointer-events-auto
					group-hover/peek:translate-x-0
					group-hover/peek:opacity-100
					focus-visible:pointer-events-auto
					focus-visible:translate-x-0
					focus-visible:opacity-100
					motion-reduce:transition-none
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
			<div
				className="
					relative
					z-[2]
					inline-flex
					items-center
				"
			>
				{children}
			</div>
		</div>
	);
}
