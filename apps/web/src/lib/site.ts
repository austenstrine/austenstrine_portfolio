export const SITE_URL = 'https://austenstrine.dev';
export const SITE_NAME = 'Austen Strine';
export const SITE_EMAIL = 'austen@austenstrine.dev';
export const SITE_PHONE = '530-966-7034';
export const SITE_PHONE_HREF = 'tel:+15309667034';
export const SITE_LINKEDIN = 'https://www.linkedin.com/in/austen-loren-strine/';
export const SITE_GITHUB = 'https://github.com/austenstrine';
export const SITE_REPO =
	'https://github.com/austenstrine/austenstrine_portfolio';

export const SITE_TITLE =
	'Austen Strine — Senior product, catalog, and search software engineer';

export const SITE_DESCRIPTION =
	'Senior product, catalog, and search software engineer with six and a half years of professional work on commerce sites. Based in Parowan, Utah; in Murray Mondays and Tuesdays; relocating to Murray full-time in December 2026.';

export const SITE_HEADLINE =
	'Senior product, catalog, and search software engineer';

export const SITE_OG_IMAGE = '/pp1_sq_sm.jpg';

export const GUIDED_DEMO_PRODUCT = {
	href: '/place-et-marque/demo-supply/mira-line-10-awg-wire-cable-0057',
	title: '10 AWG building wire',
	summary: '10 AWG THHN building wire from Demo Supply Co.',
};

export const personJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Person',
	name: SITE_NAME,
	url: SITE_URL,
	email: SITE_EMAIL,
	telephone: SITE_PHONE_HREF.replace('tel:', ''),
	image: `${SITE_URL}${SITE_OG_IMAGE}`,
	jobTitle: 'Senior product, catalog, and search software engineer',
	homeLocation: {
		'@type': 'Place',
		name: 'Parowan, Utah',
	},
	description: SITE_DESCRIPTION,
	sameAs: [SITE_LINKEDIN, SITE_GITHUB],
	knowsAbout: [
		'Next.js',
		'React',
		'TypeScript',
		'Node.js',
		'NestJS',
		'Nest.js',
		'PostgreSQL',
		'Postgres',
		'Prisma',
		'REST APIs',
		'OpenSearch',
		'Elasticsearch',
		'AWS',
		'PHP',
		'Laravel',
		'Swift',
	],
};
