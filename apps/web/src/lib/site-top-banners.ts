/**
 * Stack every `[data-maintenance-banner]` from the top of the viewport and
 * publish `--site-top-banner-h` so fixed chrome / body padding clear them.
 * CatalogHeader and BackendDownBanner both call this so late-appearing
 * banners still join the same offset stack as PardonOurDustBanner.
 */
export const SITE_TOP_BANNER_ATTR = 'data-maintenance-banner';
export const SITE_TOP_BANNER_VAR = '--site-top-banner-h';

export function syncSiteTopBanners(): number {
	if(typeof document === 'undefined') {
		return 0;
	}
	const banners = Array.from(
		document.querySelectorAll<HTMLElement>(`[${SITE_TOP_BANNER_ATTR}]`),
	);
	let offset = 0;
	for(const banner of banners) {
		banner.style.top = `${offset}px`;
		offset += banner.offsetHeight;
	}
	if(offset > 0) {
		document.documentElement.style.setProperty(
			SITE_TOP_BANNER_VAR,
			`${offset}px`,
		);
	}
	else {
		document.documentElement.style.removeProperty(SITE_TOP_BANNER_VAR);
	}
	return offset;
}
