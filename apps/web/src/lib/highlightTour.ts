export const highlightTourActivateEvent = 'highlight-tour:activate';
export const highlightTourClearEvent = 'highlight-tour:clear';

export type HighlightFeature = {
	id: string;
	label: string;
	title: string;
	summary: string;
	detail: string;
	targetSelector: string;
	codeHref: string;
	codeLabel: string;
	notes: string[];
};

export function resolveHighlightTarget(selector: string): HTMLElement | null {
	if(typeof document === 'undefined' || !selector) {
		return null;
	}

	try {
		return document.querySelector<HTMLElement>(selector);
	}
	catch {
		return null;
	}
}

export function focusHighlightTarget(selector: string): boolean {
	const target = resolveHighlightTarget(selector);
	if(!target) {
		return false;
	}

	target.scrollIntoView({
		behavior: 'smooth',
		block: 'center',
	});
	target.classList.remove('tour-target-active');
	void target.offsetWidth;
	target.classList.add('tour-target-active');
	window.setTimeout(() => {
		target.classList.remove('tour-target-active');
	}, 1600);
	return true;
}

export function focusHighlightFeature(feature: HighlightFeature | undefined): boolean {
	if(!feature?.targetSelector) {
		return false;
	}
	return focusHighlightTarget(feature.targetSelector);
}

export const features: HighlightFeature[] = [
	{
		id: 'contact-ux',
		label: 'Micro-interaction',
		title: 'Contact copy and toast feedback',
		summary: 'Jump to the contact section and try the copy flows, hover behavior, and shared toast feedback.',
		detail: 'Contact actions share hover states, mobile behavior, and toast confirmation so copy and feedback stay consistent.',
		targetSelector: '#contact',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections',
		codeLabel: 'View contact components',
		notes: [
			'Hover affordances on desktop; always-visible controls on mobile',
			'One toast path for confirmation feedback',
			'Copy targets sit in the contact layout',
		],
	},
	{
		id: 'about-layout',
		label: 'Social proof',
		title: 'Colleague recommendations',
		summary: 'Scroll to What colleagues say for manager and peer quotes about the work.',
		detail: 'The About section shows LinkedIn recommendations: portrait, relationship context, and quoted narrative, readable on mobile and desktop.',
		targetSelector: '#about',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections/AboutSection.tsx',
		codeLabel: 'View recommendations section',
		notes: [
			'Each recommendation keeps avatar, attribution, and quote together',
			'No first-person bio in this section',
			'Layout favors reading over collage',
		],
	},
	{
		id: 'skills-rhythm',
		label: 'Visual system',
		title: 'Section rhythm and hierarchy',
		summary: 'Jump to Skills & Expertise to see hierarchy from local contrast inside cards.',
		detail: 'Content sections use neutral outer shells. Stronger accents appear only where needed, with contrast inside cards.',
		targetSelector: '#skills',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections/SkillsSection.tsx',
		codeLabel: 'View section styling',
		notes: [
			'Shared section treatment across the page',
			'Accent contrast lives inside cards',
			'Fewer competing surfaces',
		],
	},
	{
		id: 'cv-flow',
		label: 'Conversion path',
		title: 'CV link from contact',
		summary: 'Jump to the CV row in contact to open the printable resume from the live site.',
		detail: 'The contact section links into a printable CV so visitors can move from the live site to a conventional resume.',
		targetSelector: '#contact-cv-row',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/blob/master_nestjs/cv.html',
		codeLabel: 'View CV artifact',
		notes: [
			'Live portfolio and printable resume share one path',
			'Stay on the page until you open the CV',
			'Useful for recruiters and technical reviewers',
		],
	},
	{
		id: 'full-stack-foundation',
		label: 'Architecture',
		title: 'Application stack behind the portfolio',
		summary: 'Focus the implementation panel for the stack that runs the site and the features still landing.',
		detail: 'The portfolio runs on a Next.js frontend and NestJS API, with room for authenticated workflows, search, and inventory tooling.',
		targetSelector: '#featured-build',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/api',
		codeLabel: 'View API source',
		notes: [
			'Next.js app-router frontend in the same repo as the API',
			'NestJS, Prisma, Redis, and OpenSearch scaffolding already in place',
			'Ready for login, search, inventory, and admin workflows',
		],
	},
];

export function findHighlightFeature(featureId: string): HighlightFeature | undefined {
	return features.find((row) => row.id === featureId);
}
