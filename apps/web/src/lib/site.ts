export const SITE_URL = 'https://www.austenstrine.dev';
export const SITE_NAME = 'Austen Strine';
export const SITE_EMAIL = 'austen@austenstrine.dev';
export const SITE_PHONE = '530-966-7034';
export const SITE_PHONE_HREF = 'tel:+15309667034';
export const SITE_LINKEDIN = 'https://www.linkedin.com/in/austen-loren-strine/';
export const SITE_GITHUB = 'https://github.com/austenstrine';
export const SITE_REPO =
	'https://github.com/austenstrine/austenstrine_portfolio';

/** Stem browsers use for Save-as-PDF when document.title is set before print. */
export const SITE_FILE_STEM = SITE_NAME.replace(/\s+/g, '-');
export const SITE_CV_PRINT_TITLE = `${SITE_FILE_STEM}-CV`;
export const SITE_EXPERIENCE_PRINT_TITLE = `${SITE_FILE_STEM}-Experience`;

export const SITE_TITLE =
	'Austen Strine | Senior Product, Catalog, and Search Software Engineer';

export const SITE_DESCRIPTION =
	'Senior Product, Catalog, and Search Software Engineer with six and a half years of professional work developing several production e-commerce sites. Based in Parowan, Utah; in Murray Mondays and Tuesdays; relocating to Murray full-time in January 2027.';

export const SITE_HEADLINE =
	'Senior Product, Catalog, and Search Software Engineer';

export const SITE_OG_IMAGE = '/pp1_sq_sm.jpg';

export const GUIDED_DEMO_PRODUCT = {
	href: '/place-et-marque/demo-supply/mira-line-10-awg-wire-cable-0057',
	title: '10 AWG building wire',
	summary: '10 AWG THHN building wire from Demo Supply Co.',
};

/** Primary seller-demo entry into Place et Marque (invite + accept + sign in). */
export const JOIN_DEMO_HREF = '/place-et-marque/join-demo';

export const PLACE_ET_MARQUE_BLURB =
	'A live multi-vendor catalog: packs, pieces, units of measure, search, and Stripe checkout. Shop as a buyer, or join Demo Supply Co. as a seller teammate to explore products, orders, members, and payouts.';

export const personJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Person',
	name: SITE_NAME,
	url: SITE_URL,
	email: SITE_EMAIL,
	telephone: SITE_PHONE_HREF.replace('tel:', ''),
	image: `${SITE_URL}${SITE_OG_IMAGE}`,
	jobTitle: 'Senior Product, Catalog, and Search Software Engineer',
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
