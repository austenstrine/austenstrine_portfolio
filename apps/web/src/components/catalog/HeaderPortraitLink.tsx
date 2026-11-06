import { CdnImg } from '../CdnImg';
import { SITE_NAME, SITE_OG_IMAGE } from '../../lib/site';

/** Portfolio home — apex without www, as specified for this peek link. */
const PORTFOLIO_HOME = 'https://austenstrine.dev/';

/**
 * Top-left header peek: only 1px of Austen’s photo shows until hover/focus,
 * then the full portrait slides in. Click opens the portfolio site.
 */
export function HeaderPortraitLink() {
	return (
		<a
			aria-label={`${SITE_NAME} — austenstrine.dev`}
			className="
				group/portrait
				absolute
				left-0
				top-0
				z-40
				flex
				h-full
				w-px
				items-center
				outline-none
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
					shrink-0
					-translate-x-[calc(100%-1px)]
					rounded-full
					border
					border-white/80
					object-cover
					shadow-sm
					transition-transform
					duration-300
					ease-out
					group-hover/portrait:translate-x-0
					group-focus-visible/portrait:translate-x-0
					motion-reduce:transition-none
				"
				src={SITE_OG_IMAGE}
			/>
		</a>
	);
}
