/**
 * Shared pill CTA motion from portfolio hero (View CV / Explore / Contact):
 * soft lift on hover. Compose with fill/outline variant classes.
 */
export const PILL_CTA_MOTION_CLASS = `
	transition
	hover:-translate-y-0.5
`;

/**
 * Layout chrome shared by hero-like pill CTAs (label + shafted arrow).
 * Includes hero lift. Use `group` so NavigatePersistentArrow can nudge.
 */
export const PILL_CTA_BASE_CLASS = `
	group
	inline-flex
	items-center
	justify-center
	gap-1.5
	rounded-full
	text-sm
	font-semibold
	transition
	hover:-translate-y-0.5
`;
