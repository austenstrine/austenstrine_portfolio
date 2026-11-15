import type { ReactNode } from 'react';
import { CdnImg } from '../CdnImg';
import { SITE_NAME, SITE_OG_IMAGE } from '../../lib/site';

/** Portfolio home — apex without www, as specified for this peek link. */
const PORTFOLIO_HOME = 'https://austenstrine.dev/';

/**
 * Hidden portfolio peek beside the Place et Marque mark.
 * Hovering the brand (logo hit area) or the portrait reveals Austen’s photo
 * middled with and to the left of the PeM mark; click opens the portfolio site.
 */
export function HeaderPortraitLink({ children }: { children: ReactNode }) {
	return (
		<div
			className="
				group/peek
				relative
				inline-flex
				items-center
			"
		>
			<a
				aria-label={`${SITE_NAME} — austenstrine.dev`}
				className="
					pointer-events-none
					absolute
					right-full
					top-1/2
					z-10
					mr-1.5
					block
					size-10
					-translate-x-2
					-translate-y-1/2
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
			</a>
			{children}
		</div>
	);
}
