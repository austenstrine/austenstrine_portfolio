/**
 * Opinionated skill tags for experience trees.
 * Reverse inheritance: detail → highlight → role (bubble up for match).
 * Siblings do not inherit sideways.
 */

export const SKILL_TAGS = [
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
	'cs-foundation',
	'seniority',
	'php',
	'laravel',
	'javascript',
	'search',
	'elasticsearch',
	'mysql',
	'mongodb',
	'redis',
	'ios',
	'swift',
	'bash',
	'postgres',
	'prisma',
	'devops',
	'support',
	'sales',
	'ops',
	'theater',
	'education',
	'leadership',
] as const;

export type SkillTag = (typeof SKILL_TAGS)[number];

export type ExperienceDetail = {
	id: string;
	text: string;
	tags?: readonly SkillTag[];
};

export type ExperienceHighlight = {
	id: string;
	/** Condensed line shown when collapsed. */
	summary: string;
	/** Expanded leaf detail(s). May include LOREM_IPSUM:<id>. */
	details: readonly ExperienceDetail[];
	tags?: readonly SkillTag[];
};

export function isLoremIpsum(text: string): boolean {
	return text.startsWith('LOREM_IPSUM:');
}

export function loremIdFromText(text: string): string | null {
	if(!isLoremIpsum(text)) {
		return null;
	}
	return text.slice('LOREM_IPSUM:'.length);
}

/** Tags declared on this highlight plus tags on its detail leaves. */
export function highlightEffectiveTags(
	highlight: ExperienceHighlight,
): readonly SkillTag[] {
	const set = new Set<SkillTag>(highlight.tags ?? []);
	for(const detail of highlight.details) {
		for(const tag of detail.tags ?? []) {
			set.add(tag);
		}
	}
	return [...set];
}

/** Role tags plus every descendant highlight/detail tag (reverse inheritance). */
export function roleEffectiveTags(role: {
	tags?: readonly SkillTag[];
	highlights: readonly ExperienceHighlight[];
}): readonly SkillTag[] {
	const set = new Set<SkillTag>(role.tags ?? []);
	for(const highlight of role.highlights) {
		for(const tag of highlightEffectiveTags(highlight)) {
			set.add(tag);
		}
	}
	return [...set];
}

export function tagsMatchSkillSet(
	tags: readonly SkillTag[],
	skillSet: readonly SkillTag[],
): boolean {
	if(skillSet.length === 0) {
		return false;
	}
	const want = new Set(skillSet);
	return tags.some((tag) => want.has(tag));
}

export function highlightMatchesSkillSet(
	highlight: ExperienceHighlight,
	skillSet: readonly SkillTag[],
): boolean {
	return tagsMatchSkillSet(highlightEffectiveTags(highlight), skillSet);
}

export function roleMatchesSkillSet(
	role: {
		tags?: readonly SkillTag[];
		highlights: readonly ExperienceHighlight[];
	},
	skillSet: readonly SkillTag[],
): boolean {
	return tagsMatchSkillSet(roleEffectiveTags(role), skillSet);
}

/** Highlight ids under a role that match the skill set (for pre-expand). */
export function matchingHighlightIds(
	role: {
		highlights: readonly ExperienceHighlight[];
	},
	skillSet: readonly SkillTag[],
): string[] {
	return role.highlights
		.filter((highlight) => highlightMatchesSkillSet(highlight, skillSet))
		.map((highlight) => highlight.id);
}

export function richHighlight(
	id: string,
	summary: string,
	detailText: string,
	tags?: readonly SkillTag[],
	detailTags?: readonly SkillTag[],
): ExperienceHighlight {
	return {
		id,
		summary,
		tags,
		details: [
			{
				id: `${id}-d0`,
				text: detailText,
				tags: detailTags ?? tags,
			},
		],
	};
}

/** Thin known fact: summary is truth; expanded body is mapped lorem until filled. */
export function thinHighlight(
	id: string,
	summary: string,
	tags?: readonly SkillTag[],
): ExperienceHighlight {
	return {
		id,
		summary,
		tags,
		details: [
			{
				id: `${id}-d0`,
				text: `LOREM_IPSUM:${id}-d0`,
				tags,
			},
		],
	};
}

/**
 * Print/PDF lines: prefer non-lorem detail text; else summary.
 * Keeps print free of LOREM_IPSUM tokens.
 */
export function highlightPrintLine(highlight: ExperienceHighlight): string {
	const real = highlight.details
		.map((detail) => detail.text)
		.filter((text) => !isLoremIpsum(text));
	if(real.length > 0) {
		return real.join(' ');
	}
	return highlight.summary;
}

export function rolePrintBullets(role: {
	highlights: readonly ExperienceHighlight[];
}): string[] {
	return role.highlights.map(highlightPrintLine);
}
