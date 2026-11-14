/** Shared copy for the /cv page and the timeline selected-experience print sheet. */

export const CV_SUMMARY_PARAGRAPHS = [
	'I\'m a Senior Product, Catalog, and Search Software Engineer with six and a half years of professional experience developing several production e-commerce sites. I specialize in owning problems end to end and I partner very well with product owners. I\'m objectively a force stack multiplier in small teams when I have leeway to move fast and drill deep.',
	'My skills as an engineer are uniquely complimented by earlier sales, theater, and customer-service roles. In those roles I experienced a wide range of personalities, needs, tastes, preferences, desires, and skill levels, which inform the kinds of decisions I make when shipping features and products that will please both product owners and users.',
] as const;

export type CvSkillGroup = {
	label: string;
	list: string;
};

export const CV_SKILL_GROUPS: CvSkillGroup[] = [
	{
		label: 'Frontend',
		list: 'Next.js, React, TypeScript, Tailwind CSS, MUI, HTML5, CSS3',
	},
	{
		label: 'Backend',
		list: 'Node.js, NestJS (Nest.js), PHP, Laravel, REST APIs, Prisma',
	},
	{
		label: 'Data & search',
		list: 'PostgreSQL (Postgres), MySQL, MongoDB, Elasticsearch, OpenSearch',
	},
	{
		label: 'Mobile',
		list: 'Swift (iOS), SQLite, Dart/Flutter (used at GO Green)',
	},
	{
		label: 'Infrastructure',
		list: 'AWS, Ubuntu, Apache, Bash, Git, CI/CD',
	},
	{
		label: 'How I work',
		list: 'Unsupervised ownership, product-owner communication, junior mentorship, production incident response.',
	},
];

export type CvCertificate = {
	title: string;
	org: string;
	/** Omit when unknown (do not invent a year). */
	dates?: string;
	location: string;
	bullets: string[];
};

export const CV_CERTIFICATES: CvCertificate[] = [
	{
		title: 'Technical Certificate, Computer Science',
		org: 'Southwest Applied Technology College (now Southwest Technical College)',
		dates: '2016–2018',
		location: 'Cedar City, UT',
		bullets: [
			'Certified proficiency in C++, Python, Java, and Swift.',
		],
	},
	{
		title: 'High School',
		org: 'Chico Sr. High School',
		location: 'Chico, CA',
		bullets: [],
	},
];
