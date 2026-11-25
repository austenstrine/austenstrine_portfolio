import {
	richHighlight,
	thinHighlight,
	type ExperienceHighlight,
	type SkillTag,
} from './experience-skills';

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
	tags?: readonly SkillTag[];
	highlights: readonly ExperienceHighlight[];
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
		tags: ['ops'],
		highlights: [
			thinHighlight(
				'timberline-h0',
				'Cut, ripped, drilled, banded, assembled, ran CNC, cleaned, and palletized cabinet doors.',
			),
			thinHighlight(
				'timberline-h1',
				'Color matching, detail work, and shop problem-solving.',
			),
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
		tags: ['ops'],
		highlights: [
			thinHighlight(
				'burger-king-h0',
				'Drive-through, front counter, cash handling, fryers, fryer maintenance, quality control, and expediting.',
			),
			thinHighlight(
				'burger-king-h1',
				'Received C-suite commendation for drive-through customer service. Began management training.',
			),
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
		tags: ['full-stack', 'delivery', 'postgres', 'prisma', 'bash', 'api-integrations'],
		highlights: [
			richHighlight(
				'lumber-h0',
				'Built a custom, industry-specific regex synthesis engine and library for raw textual data processing, inventory upload, and search keyword harvesting.',
				'Built a custom, industry-specific regex synthesis engine and library for raw textual data processing, inventory upload, and search keyword harvesting.',
				['api-integrations', 'search', 'ecommerce', 'full-stack'],
			),
			richHighlight(
				'lumber-h1',
				'Built Prisma generators that synthesized class suites (DTOs, entities, validators, Swagger) for…',
				'Built Prisma generators that synthesized class suites (DTOs, entities, validators, Swagger) for every model, plus helpers to coerce DTO data into Prisma clauses.',
				['api-integrations', 'full-stack'],
			),
			thinHighlight(
				'lumber-h2',
				'Rebuilt the core Product feature on frontend and backend.',
				['full-stack'],
			),
			richHighlight(
				'lumber-h3',
				'Wrote Bash scripts and a companion API for PostgreSQL backups, live-data debugging, and admin operations.',
				'Wrote Bash scripts and a companion API for PostgreSQL backups, live-data debugging, and admin operations.',
				['bash', 'devops'],
			),
			richHighlight(
				'lumber-h4',
				'Worked without a CTO, reporting to the owners.',
				'Worked without a CTO, reporting to the owners. I showed ownership and initiative that compensated for the team’s lack of technical direction.',
				['delivery'],
			),
			thinHighlight(
				'lumber-h5',
				'Delivered hotfixes for site-breaking issues and unblocked teammates after earlier project-direction changes.',
				['delivery'],
			),
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
		tags: ['mentorship', 'theater'],
		highlights: [
			richHighlight(
				'impac-white-christmas-h0',
				'Paid mentor and cast member in a dual-performance production (mentors-only and mentees-only cast).',
				'Paid mentor and cast member in a dual-performance production (mentors-only and mentees-only cast). Event: https://events.humanitix.com/white-christmas-at-impac-student-cast',
				['mentorship'],
			),
			thinHighlight(
				'impac-white-christmas-h1',
				'Roles: Mike; Ed Sullivan Announcer; Train Conductor; Varius Ensemble.',
			),
			richHighlight(
				'impac-white-christmas-h2',
				'Guided the acting technique, character development, and performance skills of my mentee; it was an…',
				'Guided the acting technique, character development, and performance skills of my mentee; it was an outstanding production and a successful educational experience.',
				['mentorship'],
			),
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
		tags: ['full-stack', 'ecommerce', 'php', 'laravel', 'javascript', 'mentorship', 'delivery', 'seniority'],
		highlights: [
			richHighlight(
				'gogreen-h0',
				'Senior developer on web applications including plumbersstock.com, adamsandco.net, and swplumbing.com (PHP/Laravel, JavaScript, CSS, jQuery).',
				'Senior developer on web applications including plumbersstock.com, adamsandco.net, and swplumbing.com (PHP/Laravel, JavaScript, CSS, jQuery).',
				['ecommerce', 'php', 'laravel'],
			),
			richHighlight(
				'gogreen-h1',
				'Sole/lead developer for adamsandco.net and an in-house iOS order-processing app (Swift, SQLite).',
				'Sole/lead developer for adamsandco.net and an in-house iOS order-processing app (Swift, SQLite).',
				['mobile', 'ios', 'swift', 'ecommerce'],
			),
			richHighlight(
				'gogreen-h2',
				'Sole/lead developer for in-house and third-party search (Elasticsearch, Unbxd): normalized…',
				'Sole/lead developer for in-house and third-party search (Elasticsearch, Unbxd): normalized plumbersstock.com product data into the Unbxd API; kept the Unbxd integration script updated, functional, and compatible with other site scripts after the team moved plumbersstock.com search off a prior in-house Elasticsearch implementation.',
				['api-integrations', 'search', 'ecommerce'],
			),
			richHighlight(
				'gogreen-h3',
				'Previous search coworker trained him on Elasticsearch before leaving; then inherited Elasticsearch…',
				'Previous search coworker trained him on Elasticsearch before leaving; then inherited Elasticsearch and Unbxd ownership; kept Elasticsearch working regularly and reliably for sites such as adamsandco.net so it stayed stable and fast.',
				['api-integrations', 'search', 'ecommerce'],
			),
			richHighlight(
				'gogreen-h4',
				'Built reporting tools that used Elasticsearch indexes to pull sales and inventory data and visualize them with Chart.js.',
				'Built reporting tools that used Elasticsearch indexes to pull sales and inventory data and visualize them with Chart.js.',
				['api-integrations', 'search'],
			),
			richHighlight(
				'gogreen-h5',
				'Junior server admin (Apache/Ubuntu, Bash) and junior database admin (MySQL, MongoDB).',
				'Junior server admin (Apache/Ubuntu, Bash) and junior database admin (MySQL, MongoDB). Mentored junior developers; helped establish pull-request culture.',
				['mentorship', 'mongodb', 'mysql', 'bash', 'devops'],
			),
			richHighlight(
				'gogreen-h6',
				'Migrated plumbersstock.com MongoDB product data from abandoned zizaco/mongolid (ext-mongo only) to…',
				'Migrated plumbersstock.com MongoDB product data from abandoned zizaco/mongolid (ext-mongo only) to leroy-merlin-br/mongolid by wrapping the new ODM in a light zizaco-like layer so the Laravel app could upgrade PHP without rewriting every mongolid-style call (jenssegers/mongodb was not an option).',
				['ecommerce', 'mongodb', 'php', 'laravel'],
			),
			richHighlight(
				'gogreen-h7',
				'Optimized that ODM wrapper’s document access (including optional select-style retrieval) to about…',
				'Optimized that ODM wrapper’s document access (including optional select-style retrieval) to about 9× the original zizaco performance, though it still didn’t really compete with MySQL for speed; MySQL was a messy Epicor Eclipse dump/CSV copy of a copy of the source of truth.',
				['mysql'],
			),
			richHighlight(
				'gogreen-h8',
				'Fixed a widespread Laravel app() helper pattern that constructed a heavy default instance on every…',
				'Fixed a widespread Laravel app() helper pattern that constructed a heavy default instance on every class lookup by adding a static singleton (with ->fresh() for a new instance; later cheap clones); measured about 20% aggregate backend speedup and built a benchmark/logging suite to prove it.',
				['php', 'laravel'],
			),
			richHighlight(
				'gogreen-h9',
				'Built a Redis cache ORM (remember/set/get/delete) that sped up certain pages by about 5×–7×.',
				'Built a Redis cache ORM (remember/set/get/delete) that sped up certain pages by about 5×–7×.',
				['redis'],
			),
			richHighlight(
				'gogreen-h10',
				'On adamsandco.net: built a session click-path viewer so CRM could inspect customer paths…',
				'On adamsandco.net: built a session click-path viewer so CRM could inspect customer paths and diagnose issues customers could not describe—including reports days after the fact.',
				['ecommerce'],
			),
			richHighlight(
				'gogreen-h11',
				'On adamsandco.net: built an admin tool for seasonal homepage layout and content changes so staff no longer needed a programmer ~9+ times a year.',
				'On adamsandco.net: built an admin tool for seasonal homepage layout and content changes so staff no longer needed a programmer ~9+ times a year.',
				['ecommerce'],
			),
			richHighlight(
				'gogreen-h12',
				'On plumbersstock.com: built a system to push a cookie/session clear to clients so stale cookie or…',
				'On plumbersstock.com: built a system to push a cookie/session clear to clients so stale cookie or session problems could be wiped before they caused issues.',
				['ecommerce', 'devops'],
			),
			richHighlight(
				'gogreen-h13',
				'Also used Dart/Flutter, TypeScript, Node.js, and React during this period.',
				'Also used Dart/Flutter, TypeScript, Node.js, and React during this period.',
				['typescript', 'nodejs', 'react'],
			),
			thinHighlight(
				'gogreen-h14',
				'Maintained decades-old production systems that the company still depended on.',
			),
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
		tags: ['ops'],
		highlights: [
			thinHighlight(
				'care-and-share-h0',
				'Stock and Sort: food warehouse sorting, restocking, and prep for group volunteers (Wednesdays 3–5 pm).',
			),
		],
	},
	{
		id: 'anderson',
		kind: 'non-software',
		category: 'professional',
		title: 'Territory Sales Lead',
		organization: 'Anderson Merchandisers',
		dates: 'Jul–Nov 2018',
		tags: ['leadership', 'sales'],
		highlights: [
			thinHighlight(
				'anderson-h0',
				'Delegation and deadline management across two Walmart locations.',
			),
		],
	},
	{
		id: 'edu-swatc',
		kind: 'software',
		category: 'education',
		title: 'Technical Certificate, Computer Science',
		organization: 'Southwest Applied Technology College (now Southwest Technical College)',
		dates: '2016–2018',
		location: 'Cedar City, UT',
		tags: ['cs-foundation', 'education'],
		highlights: [
			richHighlight(
				'edu-swatc-h0',
				'Certified proficiency in C++, Python, Java, and Swift.',
				'Certified proficiency in C++, Python, Java, and Swift.',
				['mobile', 'ios', 'swift'],
			),
		],
	},
	{
		id: 'edu-refcode',
		kind: 'software',
		category: 'education',
		title: 'Introductory Web Development — Refcode (pilot student)',
		organization: 'Refcode',
		dates: 'August–November 2016',
		tags: ['education', 'javascript'],
		highlights: [
			richHighlight(
				'edu-refcode-h0',
				'First student of brother Brenton Strine\'s Refcode coding bootcamp (used to test curriculum flow and…',
				'First student of brother Brenton Strine\'s Refcode coding bootcamp (used to test curriculum flow and identify common beginner questions and difficulties).',
			),
			thinHighlight(
				'edu-refcode-h1',
				'Core project: rock-paper-scissors web game (posted to GitHub November 2016).',
			),
			thinHighlight(
				'edu-refcode-h2',
				'Covered foundational HTML, CSS, JavaScript, Git/GitHub, and related web-development practices.',
			),
			thinHighlight(
				'edu-refcode-h3',
				'By early 2017 had progressed to formal C++ coursework and fluent technical discussion.',
			),
		],
	},
	{
		id: 'vivint',
		kind: 'non-software',
		category: 'professional',
		title: 'Smart Secure Specialist',
		organization: 'Vivint Smart Home',
		dates: 'Oct–Dec 2017',
		tags: ['support'],
		highlights: [
			thinHighlight(
				'vivint-h0',
				'Inbound tech support for smart home and security systems.',
			),
		],
	},
	{
		id: 'usher-usf',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Usher',
		organization: 'Utah Shakespeare Festival',
		dates: '2016–2017',
		highlights: [
			thinHighlight(
				'usher-usf-h0',
				'Volunteered as usher for multiple seasons before and after the paid House Manager role, including 2016 and 2017.',
			),
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
		tags: ['support', 'devops'],
		highlights: [
			thinHighlight(
				'infowest-h0',
				'Troubleshot Ubiquiti WISP equipment at customer and tower levels; router setup, PPPoE, IMAP/POP email, VoIP ATA.',
				['support', 'devops'],
			),
			thinHighlight(
				'infowest-h1',
				'Built an internal troubleshooting flow app (WISP-T) that reached beta.',
				['support', 'devops'],
			),
		],
	},
	{
		id: 'wedding-singer',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Glen Guglia',
		organization: 'The Wedding Singer · Cedar Valley Community Theatre',
		dates: 'Late 2015 – early 2016',
		highlights: [
			richHighlight(
				'wedding-singer-h0',
				'Played Glen Guglia; production photos: https://utahtheatrebloggers.com/22772/something-to-celebrate-…',
				'Played Glen Guglia; production photos: https://utahtheatrebloggers.com/22772/something-to-celebrate-at-the-wedding-singer · https://www.cvct.online/projects-7-6',
			),
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
		tags: ['education', 'theater'],
		highlights: [
			thinHighlight(
				'edu-suu-h0',
				'Pursued Musical Theater. Withdrew August 2016 — did not complete the degree.',
			),
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
		tags: ['ops', 'leadership'],
		highlights: [
			thinHighlight(
				'shakespeare-h0',
				'Paid house management; guest experience, ushers, seating, and accessibility for assigned shows.',
			),
		],
	},
	{
		id: 'centros',
		kind: 'non-software',
		category: 'professional',
		title: 'Dishwasher',
		organization: 'Centro\'s Woodfired Pizza',
		dates: 'May–August 2015',
		location: 'Cedar City, UT area',
		tags: ['ops'],
		highlights: [
			thinHighlight(
				'centros-h0',
				'Washed dishes, glassware, utensils, and cookware by hand and/or using commercial dishwashing equipment.',
			),
			thinHighlight(
				'centros-h1',
				'Maintained cleanliness of the dish pit, kitchen, and related areas.',
			),
			thinHighlight(
				'centros-h2',
				'Assisted with basic prep, restocking, and general kitchen support as needed.',
			),
			thinHighlight(
				'centros-h3',
				'Ensured compliance with health and safety standards for food-service sanitation.',
			),
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
		tags: ['support'],
		highlights: [
			thinHighlight(
				'convergys-h0',
				'Answered inbound Cingular and AT&T calls; cell-phone and billing support, payments, and account administration.',
			),
		],
	},
	{
		id: 'local-verifications',
		kind: 'non-software',
		category: 'professional',
		title: 'Sales Associate',
		organization: 'Local Verifications',
		dates: '2014',
		tags: ['sales'],
		highlights: [
			thinHighlight(
				'local-verifications-h0',
				'Inbound and outbound calls to expand Google Places profiles; trained in sales and marketing techniques.',
			),
		],
	},
	{
		id: 'gateway',
		kind: 'non-software',
		category: 'professional',
		title: 'Sales Representative',
		organization: 'Gateway Management Group',
		dates: 'Oct 2013–Jun 2014',
		tags: ['sales', 'mentorship', 'leadership'],
		highlights: [
			thinHighlight(
				'gateway-h0',
				'Ranked #1 nationally for installs; trained junior reps.',
				['mentorship'],
			),
		],
	},
	{
		id: 'les-mis',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Marius (lead)',
		organization: 'Les Misérables · California Regional Theatre',
		dates: 'Oct 2013',
		highlights: [
			richHighlight(
				'les-mis-h0',
				'Lead role as Marius; press: https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-…',
				'Lead role as Marius; press: https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-miserables/ (archive: https://web.archive.org/web/20240408180702/https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-miserables/)',
			),
		],
	},
	{
		id: 'anything-goes',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Billy Crocker (lead)',
		organization: 'Anything Goes · Chico Theater Company',
		dates: 'Jul–Aug 2013',
		highlights: [
			richHighlight(
				'anything-goes-h0',
				'Lead role as Billy Crocker; press: https://www.timesheraldonline.com/2013/07/18/anything-goes-at-chi…',
				'Lead role as Billy Crocker; press: https://www.timesheraldonline.com/2013/07/18/anything-goes-at-chico-theater/',
			),
		],
	},
	{
		id: 'ccc-theater-worship',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Theater & Worship leadership',
		organization: 'Campus City Connection',
		dates: '2012–2013',
		highlights: [
			thinHighlight(
				'ccc-theater-worship-h0',
				'Leadership in Theater and Worship; drama team including script writing into early 2013.',
			),
		],
	},
	{
		id: 'ccc-community-service',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Community service',
		organization: 'Campus City Connection',
		dates: '2011–2013',
		highlights: [
			richHighlight(
				'ccc-community-service-h0',
				'Weekly food service to the homeless (2012); Torres Shelter cooking and serving for ~65 people (Dec…',
				'Weekly food service to the homeless (2012); Torres Shelter cooking and serving for ~65 people (Dec 2013); comedy night fundraiser for an Africa missions trip (2011).',
			),
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
		tags: ['education'],
		highlights: [
			thinHighlight(
				'edu-simpson-h0',
				'Pursued B.S. in Music with emphasis in Composition and minor in Psychology. Did not complete the degree.',
			),
			thinHighlight(
				'edu-simpson-h1',
				'University Chorale and Drama Club (VP 2010, President 2011).',
			),
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
		tags: ['sales'],
		highlights: [
			thinHighlight(
				'old-navy-h0',
				'Floor sales, checkout, and restocking.',
			),
		],
	},
	{
		id: 'chartwells',
		kind: 'non-software',
		category: 'professional',
		title: 'Dishwasher / Floor man',
		organization: 'Chartwells',
		dates: '2012',
		tags: ['ops'],
		highlights: [
			thinHighlight(
				'chartwells-h0',
				'Dish area, closing the cafeteria, on-call and scheduled shifts.',
			),
		],
	},
	{
		id: 'choir-tours',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Choir tours',
		organization: 'High school and college',
		dates: '2007–2012',
		highlights: [
			thinHighlight(
				'choir-tours-h0',
				'New York City and San Francisco (2007, 2009); Portland, Seattle, and Northwest coast (2010–2012).',
			),
		],
	},
	{
		id: 'drama-club-simpson',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Drama Club President',
		organization: 'Simpson University',
		dates: '2010–2011',
		highlights: [
			thinHighlight(
				'drama-club-simpson-h0',
				'President (2011); Vice-President (2010).',
			),
		],
	},
	{
		id: 'taming-of-the-shrew',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'Petruchio',
		organization: 'The Taming of the Shrew · Simpson University Drama Club',
		dates: '2011',
		highlights: [
			richHighlight(
				'taming-of-the-shrew-h0',
				'Role as Petruchio; video: https://www.youtube.com/playlist?list=PLF38A98137436629F',
				'Role as Petruchio; video: https://www.youtube.com/playlist?list=PLF38A98137436629F',
			),
		],
	},
	{
		id: 'john-his-story',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'John and Jesus',
		organization: 'John, His Story · Simpson University Drama Club',
		dates: '2011',
		highlights: [
			richHighlight(
				'john-his-story-h0',
				'Roles as John and Jesus; video: https://www.youtube.com/playlist?list=PL02749288672392F2',
				'Roles as John and Jesus; video: https://www.youtube.com/playlist?list=PL02749288672392F2',
			),
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
		tags: ['education'],
		highlights: [
		],
	},
	{
		id: 'high-school-choir',
		kind: 'non-software',
		category: 'extracurricular',
		title: 'High school choir',
		organization: 'Chico Sr. High School',
		dates: '2005–2009',
		location: 'Chico, CA',
		highlights: [
			thinHighlight(
				'high-school-choir-h0',
				'Sang bass and baritone in Madrigals, a cappella, and Sac Street Boys.',
			),
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

export {
	highlightEffectiveTags,
	highlightMatchesSkillSet,
	isLoremIpsum,
	matchingHighlightIds,
	roleEffectiveTags,
	roleMatchesSkillSet,
	rolePrintBullets,
} from './experience-skills';
export type {
	ExperienceDetail,
	ExperienceHighlight,
	SkillTag,
} from './experience-skills';
