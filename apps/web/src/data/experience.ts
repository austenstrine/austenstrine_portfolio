export type ExperienceKind = 'software' | 'non-software';

/** Timeline facet separate from software/non-software; AND’d with kind includes. */
export type ExperienceCategory =
	| 'professional'
	| 'education'
	| 'extracurricular';

export type ExperienceRole = {
	id: string;
	kind: ExperienceKind;
	category: ExperienceCategory;
	title: string;
	organization: string;
	/** Omit when unknown (do not invent a year). */
	dates?: string;
	location?: string;
	bullets: string[];
};

export const professionalExperience: ExperienceRole[] = [
	{
		id: 'timberline',
		kind: 'non-software',
		category: 'professional',
		title: 'Door Builder',
		organization: 'Timberline Cabinets (via Express Employment Professionals)',
		dates: 'Jul 2026 – Sep 2026 · 3 mos',
		location: 'Cedar City, UT',
		bullets: [
			'Cut, ripped, drilled, banded, assembled, ran CNC, cleaned, and palletized cabinet doors.',
			'Color matching, detail work, and shop problem-solving.',
		],
	},
	{
		id: 'burger-king',
		kind: 'non-software',
		category: 'professional',
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
		category: 'professional',
		title: 'Full-stack Developer',
		organization: 'Lumber Marketplace',
		dates: 'Jan 2024 – Jun 2025 · 1 yr 6 mos',
		location: 'Remote · Columbia, TN',
		bullets: [
			'Built a custom, industry-specific regex synthesis engine and library for raw textual data processing, inventory upload, and search keyword harvesting.',
			'Built Prisma generators that synthesized class suites (DTOs, entities, validators, Swagger) for every model, plus helpers to coerce DTO data into Prisma clauses.',
			'Rebuilt the core Product feature on frontend and backend.',
			'Wrote Bash scripts and a companion API for PostgreSQL backups, live-data debugging, and admin operations.',
			'Worked without a CTO, reporting to the owners. I showed ownership and initiative that compensated for the team’s lack of technical direction.',
			'Delivered hotfixes for site-breaking issues and unblocked teammates after earlier project-direction changes.',
		],
	},
	{
		id: 'impac-white-christmas',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Mentor / Cast Member',
		organization: 'White Christmas · IMPAC',
		dates: 'December 2023',
		location: 'Cedar City',
		bullets: [
			'Paid mentor and cast member in a dual-performance production (mentors-only and mentees-only cast).',
			'Roles: Mike; Ed Sullivan Announcer; Train Conductor; Varius Ensemble.',
			'Guided the acting technique, character development, and performance skills of my mentee; it was an outstanding production and a successful educational experience.',
		],
	},
	{
		id: 'gogreen',
		kind: 'software',
		category: 'professional',
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
		id: 'care-and-share',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Warehouse Volunteer',
		organization: 'Iron County Care and Share',
		dates: '2018',
		location: 'Cedar City / Enoch',
		bullets: [
			'Stock and Sort: food warehouse sorting, restocking, and prep for group volunteers (Wednesdays 3–5 pm).',
		],
	},
	{
		id: 'anderson',
		kind: 'non-software',
		category: 'professional',
		title: 'Territory Sales Lead',
		organization: 'Anderson Merchandisers',
		dates: 'Jul–Nov 2018',
		bullets: [
			'Delegation and deadline management across two Walmart locations.',
		],
	},
	{
		id: 'edu-swatc',
		kind: 'software',
		category: 'education',
		title: 'Technical Certificate, Computer Science',
		organization:
			'Southwest Applied Technology College (now Southwest Technical College)',
		dates: '2016–2018',
		location: 'Cedar City, UT',
		bullets: [
			'Certified proficiency in C++, Python, Java, and Swift.',
		],
	},
	{
		id: 'vivint',
		kind: 'non-software',
		category: 'professional',
		title: 'Smart Secure Specialist',
		organization: 'Vivint Smart Home',
		dates: 'Oct–Dec 2017',
		bullets: [
			'Inbound tech support for smart home and security systems.',
		],
	},
	{
		id: 'usher-usf',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Usher',
		organization: 'Utah Shakespeare Festival',
		dates: '2016–2017',
		bullets: [
			'Volunteered as usher for multiple seasons before and after the paid House Manager role, including 2016 and 2017.',
		],
	},
	{
		id: 'infowest',
		kind: 'software',
		category: 'professional',
		title: 'Tech Support',
		organization: 'Infowest Inc.',
		dates: 'Mar 2016 – Oct 2017 · 1 yr 7 mos',
		location: 'Cedar City, UT',
		bullets: [
			'Troubleshot Ubiquiti WISP equipment at customer and tower levels; router setup, PPPoE, IMAP/POP email, VoIP ATA.',
			'Built an internal troubleshooting flow app (WISP-T) that reached beta.',
		],
	},
	{
		id: 'wedding-singer',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Glen Guglia',
		organization: 'The Wedding Singer · Cedar Valley Community Theatre',
		dates: 'Late 2015 – early 2016',
		bullets: [
			'Played Glen Guglia; production photos: https://utahtheatrebloggers.com/22772/something-to-celebrate-at-the-wedding-singer · https://www.cvct.online/projects-7-6',
		],
	},
	{
		id: 'edu-suu',
		kind: 'non-software',
		category: 'education',
		title: 'Musical Theater — pursued',
		organization: 'Southern Utah University (SUU)',
		dates: '2015–2016',
		location: 'Cedar City, UT',
		bullets: [
			'Pursued Musical Theater. Withdrew August 2016 — did not complete the degree.',
		],
	},
	{
		id: 'shakespeare',
		kind: 'non-software',
		category: 'professional',
		title: 'House Manager',
		organization: 'Utah Shakespeare Festival',
		dates: 'Jun–Nov 2015',
		location: 'Cedar City, UT',
		bullets: [
			'Paid house management; guest experience, ushers, seating, and accessibility for assigned shows.',
		],
	},
	{
		id: 'centros',
		kind: 'non-software',
		category: 'professional',
		title: 'Dishwasher',
		organization: "Centro's Woodfired Pizza",
		dates: 'May–August 2015',
		location: 'Cedar City, UT area',
		bullets: [
			'Washed dishes, glassware, utensils, and cookware by hand and/or using commercial dishwashing equipment.',
			'Maintained cleanliness of the dish pit, kitchen, and related areas.',
			'Assisted with basic prep, restocking, and general kitchen support as needed.',
			'Ensured compliance with health and safety standards for food-service sanitation.',
		],
	},
	{
		id: 'convergys',
		kind: 'non-software',
		category: 'professional',
		title: 'Customer Service Representative',
		organization: 'Convergys',
		dates: '2014',
		location: 'Cedar City / St. George, UT area',
		bullets: [
			'Answered inbound Cingular and AT&T calls; cell-phone and billing support, payments, and account administration.',
		],
	},
	{
		id: 'local-verifications',
		kind: 'non-software',
		category: 'professional',
		title: 'Sales Associate',
		organization: 'Local Verifications',
		dates: '2014',
		bullets: [
			'Inbound and outbound calls to expand Google Places profiles; trained in sales and marketing techniques.',
		],
	},
	{
		id: 'gateway',
		kind: 'non-software',
		category: 'professional',
		title: 'Sales Representative',
		organization: 'Gateway Management Group',
		dates: 'Oct 2013–Jun 2014',
		bullets: [
			'Ranked #1 nationally for installs; trained junior reps.',
		],
	},
	{
		id: 'les-mis',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Marius (lead)',
		organization: 'Les Misérables · California Regional Theatre',
		dates: 'Oct 2013',
		bullets: [
			'Lead role as Marius; press: https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-miserables/ (archive: https://web.archive.org/web/20240408180702/https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-miserables/)',
		],
	},
	{
		id: 'anything-goes',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Billy Crocker (lead)',
		organization: 'Anything Goes · Chico Theater Company',
		dates: 'Jul–Aug 2013',
		bullets: [
			'Lead role as Billy Crocker; press: https://www.timesheraldonline.com/2013/07/18/anything-goes-at-chico-theater/',
		],
	},
	{
		id: 'ccc-theater-worship',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Theater & Worship leadership',
		organization: 'Campus City Connection',
		dates: '2012–2013',
		bullets: [
			'Leadership in Theater and Worship; drama team including script writing into early 2013.',
		],
	},
	{
		id: 'ccc-community-service',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Community service',
		organization: 'Campus City Connection',
		dates: '2011–2013',
		bullets: [
			'Weekly food service to the homeless (2012); Torres Shelter cooking and serving for ~65 people (Dec 2013); comedy night fundraiser for an Africa missions trip (2011).',
		],
	},
	{
		id: 'edu-simpson',
		kind: 'non-software',
		category: 'education',
		title: 'B.S. in Music (Composition) — pursued',
		organization: 'Simpson University',
		dates: '2010–2013',
		location: 'Redding, CA',
		bullets: [
			'Pursued B.S. in Music with emphasis in Composition and minor in Psychology. Did not complete the degree.',
			'University Chorale and Drama Club (VP 2010, President 2011).',
		],
	},
	{
		id: 'old-navy',
		kind: 'non-software',
		category: 'professional',
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
		category: 'professional',
		title: 'Dishwasher / Floor man',
		organization: 'Chartwells',
		dates: '2012',
		bullets: [
			'Dish area, closing the cafeteria, on-call and scheduled shifts.',
		],
	},
	{
		id: 'choir-tours',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Choir tours',
		organization: 'High school and college',
		dates: '2007–2012',
		bullets: [
			'New York City and San Francisco (2007, 2009); Portland, Seattle, and Northwest coast (2010–2012).',
		],
	},
	{
		id: 'drama-club-simpson',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Drama Club President',
		organization: 'Simpson University',
		dates: '2010–2011',
		bullets: [
			'President (2011); Vice-President (2010).',
		],
	},
	{
		id: 'taming-of-the-shrew',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Petruchio',
		organization: 'The Taming of the Shrew · Simpson University Drama Club',
		dates: '2011',
		bullets: [
			'Role as Petruchio; video: https://www.youtube.com/playlist?list=PLF38A98137436629F',
		],
	},
	{
		id: 'john-his-story',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'John and Jesus',
		organization: 'John, His Story · Simpson University Drama Club',
		dates: '2011',
		bullets: [
			'Roles as John and Jesus; video: https://www.youtube.com/playlist?list=PL02749288672392F2',
		],
	},
	{
		id: 'edu-chico-hs',
		kind: 'non-software',
		category: 'education',
		title: 'High School Diploma',
		organization: 'Chico Sr. High School',
		dates: '2005–2009',
		location: 'Chico, CA',
		bullets: [],
	},
	{
		id: 'high-school-choir',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'High school choir',
		organization: 'Chico Sr. High School',
		dates: '2005–2009',
		location: 'Chico, CA',
		bullets: [
			'Sang bass and baritone in Madrigals, a cappella, and Sac Street Boys.',
		],
	},
];

export const softwareExperience = professionalExperience.filter(
	(role) => role.kind === 'software',
);

export const otherRecentExperience = professionalExperience.filter(
	(role) => role.kind === 'non-software',
);

export const workExperienceRoles = professionalExperience.filter(
	(role) => role.category === 'professional',
);

export const educationExperienceRoles = professionalExperience.filter(
	(role) => role.category === 'education',
);

export const extracurricularExperienceRoles = professionalExperience.filter(
	(role) => role.category === 'extracurricular',
);
