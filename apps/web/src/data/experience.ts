export type ExperienceKind = 'software' | 'non-software';

export type ExperienceRole = {
	id: string;
	kind: ExperienceKind;
	title: string;
	organization: string;
	dates: string;
	location?: string;
	bullets: string[];
};

export type EducationEntry = {
	credential: string;
	school: string;
	place: string;
	dates: string;
	note: string;
};

export const professionalExperience: ExperienceRole[] = [
	{
		id: 'timberline',
		kind: 'non-software',
		title: 'Door Builder',
		organization: 'Timberline Cabinets (via Express Employment Professionals)',
		dates: 'Jul 2026 – Aug 2026 · 2 mos',
		location: 'Cedar City, UT',
		bullets: [
			'Cut, ripped, drilled, banded, assembled, ran CNC, cleaned, and palletized cabinet doors.',
			'Color matching, detail work, and shop problem-solving.',
		],
	},
	{
		id: 'burger-king',
		kind: 'non-software',
		title: 'Team Member',
		organization: 'Burger King (New Era Management, LLC)',
		dates: 'Aug 2025 – May 2026 · 10 mos',
		location: 'Cedar City, UT',
		bullets: [
			'Drive-through, front counter, cash handling, fryers, fryer maintenance, quality control, and expediting.',
			'Received C-suite commendation for drive-through customer service. Began management training.',
		],
	},
	{
		id: 'lumber',
		kind: 'software',
		title: 'Full-stack Developer',
		organization: 'Lumber Marketplace',
		dates: 'Jan 2024 – Jun 2025 · 1 yr 6 mos',
		location: 'Remote · Columbia, TN',
		bullets: [
			'Built a custom, industry-specific regex synthesis engine and library for raw textual data processing, inventory upload, and search keyword harvesting.',
			'Built Prisma generators that synthesized class suites (DTOs, entities, validators, Swagger) for every model, plus helpers to coerce DTO data into Prisma clauses.',
			'Rebuilt a poorly implemented core Product feature on frontend and backend.',
			'Wrote Bash scripts and a companion API for PostgreSQL backups, live-data debugging, and admin operations.',
			'Worked without a CTO, reporting to the owners. I showed ownership and initiative that compensated for the team’s lack of technical direction.',
			'Delivered hotfixes for site-breaking issues and unblocked teammates after earlier project-direction changes.',
		],
	},
	{
		id: 'gogreen',
		kind: 'software',
		title: 'Senior Application Developer',
		organization: 'GO Green Enterprises',
		dates: 'Nov 2018 – Nov 2023 · 5 yrs 1 mo',
		location: 'Southwest Utah · On-site',
		bullets: [
			'Senior developer on web applications including plumbersstock.com, adamsandco.net, and swplumbing.com (PHP/Laravel, JavaScript, CSS, jQuery).',
			'Sole/lead developer for adamsandco.net and an in-house iOS order-processing app (Swift, SQLite).',
			'Sole/lead developer for in-house and third-party search (Elasticsearch, Unbxd).',
			'Junior server admin (Apache/Ubuntu, Bash) and junior database admin (MySQL, MongoDB). Mentored junior developers; helped establish pull-request culture.',
			'Also used Dart/Flutter, TypeScript, Node.js, and React during this period.',
			'Maintained decades-old production systems that the company still depended on.',
		],
	},
	{
		id: 'anderson',
		kind: 'non-software',
		title: 'Territory Sales Lead',
		organization: 'Anderson Merchandisers',
		dates: 'Jul–Nov 2018',
		bullets: [
			'Delegation and deadline management across two Walmart locations.',
		],
	},
	{
		id: 'vivint',
		kind: 'non-software',
		title: 'Smart Secure Specialist',
		organization: 'Vivint Smart Home',
		dates: 'Oct–Dec 2017',
		bullets: [
			'Inbound tech support for smart home and security systems.',
		],
	},
	{
		id: 'infowest',
		kind: 'software',
		title: 'Tech Support',
		organization: 'Infowest Inc.',
		dates: 'Mar 2016 – Sep 2017 · 1 yr 7 mos',
		location: 'Cedar City, UT',
		bullets: [
			'Troubleshot Ubiquiti WISP equipment at customer and tower levels; router setup, PPPoE, IMAP/POP email, VoIP ATA.',
			'Built an internal troubleshooting flow app (WISP-T) that reached beta.',
		],
	},
	{
		id: 'shakespeare',
		kind: 'non-software',
		title: 'House Management',
		organization: 'Utah Shakespeare Festival',
		dates: 'Jun–Nov 2015',
		location: 'Cedar City, UT',
		bullets: [
			'Guest experience, ushers, seating, and accessibility for assigned shows.',
		],
	},
	{
		id: 'gateway',
		kind: 'non-software',
		title: 'Sales Representative',
		organization: 'Gateway Management Group',
		dates: 'Oct 2013–Jun 2014',
		bullets: [
			'Ranked #1 nationally for installs; trained junior reps.',
		],
	},
	{
		id: 'old-navy',
		kind: 'non-software',
		title: 'Salesman / Cashier',
		organization: 'Gap Inc. / Old Navy',
		dates: 'Oct 2012–Jan 2013',
		location: 'Chico, CA',
		bullets: [
			'Floor sales, checkout, and restocking.',
		],
	},
	{
		id: 'chartwells',
		kind: 'non-software',
		title: 'Dishwasher / Floor man',
		organization: 'Chartwells',
		dates: '2012',
		bullets: [
			'Dish area, closing the cafeteria, on-call and scheduled shifts.',
		],
	},
];

export const softwareExperience = professionalExperience.filter(
	(role) => role.kind === 'software',
);

export const otherRecentExperience = professionalExperience.filter(
	(role) => role.kind === 'non-software',
);

export const education: EducationEntry[] = [
	{
		credential: 'Technical Certificate, Computer Science',
		school:
			'Southwest Applied Technology College (now Southwest Technical College)',
		place: 'Cedar City, UT',
		dates: '2016–2018',
		note: 'Certified proficiency in C++, Python, Java, and Swift.',
	},
];
