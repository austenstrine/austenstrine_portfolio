import { CdnImg } from '../CdnImg';
import { SITE_NAME, SITE_OG_IMAGE } from '../../lib/site';

/** Portfolio home — apex without www, as specified for this peek link. */
const PORTFOLIO_HOME = 'https://austenstrine.dev/';

/**
 * Fixed top-left 5×5 transparent hover hitbox (not a link / clickthrough).
 * Hovering the box or the portrait animates the image fully in; leaving both
 * animates it out. Clicking the portrait opens the portfolio site.
 */
export function HeaderPortraitLink() {
	return (
		<div
			className="
				pointer-events-none
				fixed
				left-0
				top-0
				z-40
			"
		>
			{/* Hover-only hitbox — not a control; clicks are not navigational. */}
			<div
				aria-hidden
				className="
					peer/peek
					pointer-events-auto
					absolute
					left-0
					top-0
					z-10
					size-[5px]
				"
			/>
			<a
				aria-label={`${SITE_NAME} — austenstrine.dev`}
				className="
					pointer-events-auto
					absolute
					left-0
					top-0
					block
					size-10
					-translate-x-full
					outline-none
					transition-transform
					duration-300
					ease-out
					hover:translate-x-0
					focus-visible:translate-x-0
					peer-hover/peek:translate-x-0
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
					src={SITE_OG_IMAGE}
				/>
			</a>
		</div>
	);
}
