import {
	filterPreExpandWithoutLorem,
	matchingHighlightIds,
	type ExperienceHighlight,
	type SkillTag,
} from './experience-skills';
import { professionalExperience } from './experience';
import { SITE_BLURB, SITE_HEADLINE } from '../lib/site';

function experienceHighlightsById(): Map<string, ExperienceHighlight> {
	const map = new Map<string, ExperienceHighlight>();
	for(const role of professionalExperience) {
		for(const highlight of role.highlights) {
			map.set(highlight.id, highlight);
		}
	}
	return map;
}

export type ForTargetConfig = {
	slug: string;
	/** Hero / framing title. Truthful framing, not a fake employer title claim. */
	headline: string;
	blurb: string;
	/** Skills used for reverse-inheritance match → pre-expand. */
	skillSet: readonly SkillTag[];
	/** Optional explicit pre-expand; default = all matching highlight ids. */
	preExpandHighlightIds?: readonly string[];
};

export type HomepageTailorConfig = {
	headline: string;
	blurb: string;
	skillSet: readonly SkillTag[];
	preExpandHighlightIds: readonly string[];
};

export const DEFAULT_HOMEPAGE_TAILOR: HomepageTailorConfig = {
	headline: SITE_HEADLINE,
	blurb: SITE_BLURB,
	skillSet: [],
	preExpandHighlightIds: [],
};

/** REDO Senior/Staff SE — see Project internal/redo-senior-staff-jd.md */
export const REDO_SENIOR_STAFF_SKILL_SET: readonly SkillTag[] = [
	'full-stack',
	'api-integrations',
	'mentorship',
	'typescript',
	'nodejs',
	'react',
	'ecommerce',
	'mobile',
	'delivery',
];

/**
 * Explicit SE pre-expand: GoGreen + Lumber only (not mentorship spill).
 * Omit thin/lorem highlights (lumber-h2, lumber-h5, gogreen-h14, …).
 * Runtime also strips any id whose detail is still LOREM_IPSUM.
 */
export const REDO_PRE_EXPAND_HIGHLIGHT_IDS: readonly string[] = [
	'lumber-h0',
	'lumber-h1',
	'lumber-h3',
	'lumber-h4',
	'gogreen-h0',
	'gogreen-h1',
	'gogreen-h2',
	'gogreen-h3',
	'gogreen-h4',
	'gogreen-h5',
	'gogreen-h6',
	'gogreen-h7',
	'gogreen-h8',
	'gogreen-h9',
	'gogreen-h10',
	'gogreen-h11',
	'gogreen-h12',
	'gogreen-h13',
];

const REDO_BLURB =
	'I\'m targeting Senior Software Engineer roles with evidenced strength in full-stack web apps, API integrations, and mentoring. At GO Green Enterprises I was Senior Application Developer on production e-commerce sites (plumbersstock.com, adamsandco.net, swplumbing.com), owned Unbxd/Elasticsearch search integrations, mentored juniors, and helped establish pull-request culture. I was also sole/lead developer for an in-house iOS order-processing app. At Lumber Marketplace I rebuilt core product surfaces end-to-end and shipped Prisma/API tooling. During the GoGreen period I also used TypeScript, Node.js, and React. I live in Parowan, Utah; I\'m in Murray Mondays and Tuesdays; relocating to Murray full-time in January 2027. Open to on-site and hybrid in the Salt Lake Valley.';

export const FOR_TARGETS: Record<string, ForTargetConfig> = {
	'REDO-Senior-Staff-Software-Engineer': {
		slug: 'REDO-Senior-Staff-Software-Engineer',
		headline: 'Senior Software Engineer',
		blurb: REDO_BLURB,
		skillSet: REDO_SENIOR_STAFF_SKILL_SET,
		preExpandHighlightIds: REDO_PRE_EXPAND_HIGHLIGHT_IDS,
	},
};

export function preExpandIdsForSkillSet(
	skillSet: readonly SkillTag[],
): string[] {
	if(skillSet.length === 0) {
		return [];
	}
	const raw = professionalExperience.flatMap((role) =>
		matchingHighlightIds(role, skillSet),
	);
	return filterPreExpandWithoutLorem(raw, experienceHighlightsById());
}

export function resolveHomepageTailor(
	partial?: Partial<HomepageTailorConfig> | null,
): HomepageTailorConfig {
	if(!partial) {
		return DEFAULT_HOMEPAGE_TAILOR;
	}
	const skillSet = partial.skillSet ?? DEFAULT_HOMEPAGE_TAILOR.skillSet;
	const rawPreExpand =
		partial.preExpandHighlightIds
		?? (
			skillSet.length > 0
				? preExpandIdsForSkillSet(skillSet)
				: DEFAULT_HOMEPAGE_TAILOR.preExpandHighlightIds
		);
	const preExpandHighlightIds = filterPreExpandWithoutLorem(
		rawPreExpand,
		experienceHighlightsById(),
	);
	return {
		headline: partial.headline ?? DEFAULT_HOMEPAGE_TAILOR.headline,
		blurb: partial.blurb ?? DEFAULT_HOMEPAGE_TAILOR.blurb,
		skillSet,
		preExpandHighlightIds,
	};
}

export function getForTarget(
	slug: string,
): HomepageTailorConfig | null {
	const target = FOR_TARGETS[slug];
	if(!target) {
		return null;
	}
	return resolveHomepageTailor({
		headline: target.headline,
		blurb: target.blurb,
		skillSet: target.skillSet,
		preExpandHighlightIds: target.preExpandHighlightIds
			? [...target.preExpandHighlightIds]
			: preExpandIdsForSkillSet(target.skillSet),
	});
}

/** Stable list for docs / audits. */
export function listForTargetSlugs(): string[] {
	return Object.keys(FOR_TARGETS);
}
