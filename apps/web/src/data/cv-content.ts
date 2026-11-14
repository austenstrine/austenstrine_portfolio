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
		title: 'Musical Theater — pursued',
		org: 'Southern Utah University (SUU)',
		dates: '2015–2016',
		location: 'Cedar City, UT',
		bullets: [
			'Pursued Musical Theater. Withdrew August 2016 — did not complete the degree.',
		],
	},
	{
		title: 'B.S. in Music (Composition) — pursued',
		org: 'Simpson University',
		dates: '2010–2013',
		location: 'Redding, CA',
		bullets: [
			'Pursued B.S. in Music with emphasis in Composition and minor in Psychology. Did not complete the degree.',
			'University Chorale and Drama Club (VP 2010, President 2011).',
		],
	},
	{
		title: 'High School Diploma',
		org: 'Chico Sr. High School',
		dates: '2005–2009',
		location: 'Chico, CA',
		bullets: [],
	},
];
