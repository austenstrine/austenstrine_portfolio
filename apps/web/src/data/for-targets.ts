import {
	matchingHighlightIds,
	type SkillTag,
} from './experience-skills';
import { professionalExperience } from './experience';
import { SITE_BLURB, SITE_HEADLINE } from '../lib/site';

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
	'aws',
	'mobile',
	'delivery',
	'product-collaboration',
];

const REDO_BLURB =
	'I\'m targeting Senior Software Engineer roles with evidenced strength in full-stack web apps, API integrations, and mentoring. At GO Green Enterprises I was Senior Application Developer on production e-commerce sites (plumbersstock.com, adamsandco.net, swplumbing.com), owned Unbxd/Elasticsearch search integrations, mentored juniors, and helped establish pull-request culture — including an in-house iOS order app. At Lumber Marketplace I rebuilt core product surfaces end-to-end and shipped Prisma/API tooling. I also work in TypeScript, Node.js, and React. I live in Parowan, Utah; I\'m in Murray Mondays and Tuesdays; relocating to Murray full-time in January 2027. Open to on-site and hybrid in the Salt Lake Valley.';

export const FOR_TARGETS: Record<string, ForTargetConfig> = {
	'REDO-Senior-Staff-Software-Engineer': {
		slug: 'REDO-Senior-Staff-Software-Engineer',
		headline: 'Senior Software Engineer',
		blurb: REDO_BLURB,
		skillSet: REDO_SENIOR_STAFF_SKILL_SET,
	},
};

export function preExpandIdsForSkillSet(
	skillSet: readonly SkillTag[],
): string[] {
	if(skillSet.length === 0) {
		return [];
	}
	return professionalExperience.flatMap((role) =>
		matchingHighlightIds(role, skillSet),
	);
}

export function resolveHomepageTailor(
	partial?: Partial<HomepageTailorConfig> | null,
): HomepageTailorConfig {
	if(!partial) {
		return DEFAULT_HOMEPAGE_TAILOR;
	}
	const skillSet = partial.skillSet ?? DEFAULT_HOMEPAGE_TAILOR.skillSet;
	const preExpandHighlightIds =
		partial.preExpandHighlightIds
		?? (
			skillSet.length > 0
				? preExpandIdsForSkillSet(skillSet)
				: DEFAULT_HOMEPAGE_TAILOR.preExpandHighlightIds
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
