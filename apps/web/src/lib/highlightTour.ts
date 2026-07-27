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

export const features: HighlightFeature[] = [
	{
		id: 'contact-ux',
		label: 'Micro-interaction',
		title: 'Contact UX That Rewards Curiosity',
		summary: 'Jump to the contact section and try the copy flows, hover behavior, and shared toast feedback.',
		detail: 'This part of the site demonstrates product-minded frontend work: the interaction is simple, but the hover states, mobile behavior, and confirmation feedback were tuned to feel deliberate instead of decorative.',
		targetSelector: '#contact',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections',
		codeLabel: 'View contact components',
		notes: [
			'Responsive hover versus always-visible affordances',
			'Universal toast feedback instead of repeated inline popups',
			'Copy targets designed to feel integrated, not widget-like',
		],
	},
	{
		id: 'about-layout',
		label: 'Responsive layout',
		title: 'Desktop Stickiness With Mobile Reading Flow',
		summary: 'Scroll to About Me to see the portrait hold visual weight on desktop without disrupting mobile reading order.',
		detail: 'The layout shifts by intent rather than by accident. On larger screens, the portrait acts as a stable visual anchor while the text scrolls. On mobile, the reading order stays clean: header, body, then image.',
		targetSelector: '#about',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections/AboutSection.tsx',
		codeLabel: 'View layout implementation',
		notes: [
			'Sticky positioning constrained by the section container',
			'Different DOM and layout concerns handled without breaking mobile flow',
			'Reading rhythm prioritized over decorative balance',
		],
	},
	{
		id: 'skills-rhythm',
		label: 'Visual system',
		title: 'Section Rhythm Over Arbitrary Variation',
		summary: 'Jump to Skills & Expertise to see how hierarchy is created with internal contrast instead of a one-off section background.',
		detail: 'This section shows the design principle used across the site: neutral outer shells for content sections, stronger accent treatments only where emphasis is deserved, and local contrast inside cards rather than random palette shifts.',
		targetSelector: '#skills',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/web/src/components/sections/SkillsSection.tsx',
		codeLabel: 'View section styling',
		notes: [
			'Consistent section treatment across the page',
			'Contrast pushed down into cards instead of outer wrappers',
			'Cleaner visual hierarchy with fewer competing surfaces',
		],
	},
	{
		id: 'cv-flow',
		label: 'Conversion path',
		title: 'CV Access Built Into The Live Experience',
		summary: 'Jump directly to the CV row in contact and use the live site as the entry point into the printable artifact.',
		detail: 'Rather than treating the resume as a disconnected file, the site makes it part of the interaction model. Visitors can explore the live experience, then pivot straight into a printable CV when they want a more conventional artifact.',
		targetSelector: '#contact-cv-row',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/blob/master_nestjs/cv.html',
		codeLabel: 'View CV artifact',
		notes: [
			'Live portfolio and printable resume support each other',
			'Interaction stays within the page until the user chooses otherwise',
			'Useful for both recruiters and technical reviewers',
		],
	},
	{
		id: 'full-stack-foundation',
		label: 'Architecture',
		title: 'This Portfolio Is Backed By Real Application Structure',
		summary: 'Focus the implementation panel to see the stack used to support the site and the features still being added.',
		detail: 'The portfolio is not being treated as a static brochure. It is being rebuilt as a real product surface with a Next.js frontend, a NestJS API, and room for authenticated workflows, search, and inventory tooling as those features come online.',
		targetSelector: '#featured-build',
		codeHref: 'https://github.com/austenstrine/austenstrine_portfolio/tree/master_nestjs/apps/api',
		codeLabel: 'View API source',
		notes: [
			'Next.js app-router frontend in the same repo as the API',
			'NestJS, Prisma, Redis, and OpenSearch scaffolding already in place',
			'Built to absorb login, search, inventory, and admin workflows',
		],
	},
];
