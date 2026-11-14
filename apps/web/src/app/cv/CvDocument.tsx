import {
	SITE_EMAIL,
	SITE_GITHUB,
	SITE_HEADLINE,
	SITE_LINKEDIN,
	SITE_NAME,
	SITE_PHONE,
	SITE_PHONE_HREF,
	SITE_URL,
} from '../../lib/site';

export function CvDocument() {
	const siteHost = SITE_URL.replace(/^https?:\/\//, '');
	const linkedInPath = SITE_LINKEDIN
		.replace(/^https?:\/\//, '')
		.replace(/^www\./, '')
		.replace(/\/$/, '');
	const githubPath = SITE_GITHUB
		.replace(/^https?:\/\//, '');

	return (
		<div className="cv">
			<header className="cv-header">
				<h1>
					{SITE_NAME}
				</h1>
				<p className="cv-headline">
					{SITE_HEADLINE}
				</p>
				<div className="cv-contact">
					<ul className="cv-contact-list">
						<li>
							<a href={`mailto:${SITE_EMAIL}`}>
								{SITE_EMAIL}
							</a>
						</li>
						<li>
							<a href={SITE_PHONE_HREF}>
								{SITE_PHONE}
							</a>
						</li>
						<li>
							<a href={SITE_URL}>
								{siteHost}
							</a>
						</li>
					</ul>
					<ul className="cv-contact-list">
						<li>
							<a
								href={SITE_LINKEDIN}
								target="_blank"
								rel="noopener noreferrer"
							>
								{linkedInPath}
							</a>
						</li>
						<li>
							<a
								href={SITE_GITHUB}
								target="_blank"
								rel="noopener noreferrer"
							>
								{githubPath}
							</a>
						</li>
					</ul>
					<p className="cv-location">
						<span>
							Parowan, UT
						</span>
						<span
							className="cv-sep"
							aria-hidden="true"
						>
							·
						</span>
						<span>
							Murray Mon/Tue
						</span>
						<span
							className="cv-sep"
							aria-hidden="true"
						>
							·
						</span>
						<span>
							relocating full-time December 2026
						</span>
					</p>
				</div>
			</header>

			<section className="cv-section cv-summary">
				<h2 className="cv-section-title">
					Summary
				</h2>
				<p>
					I&apos;m a Senior Product, Catalog, and Search Software Engineer with six and a half years of professional software work (November 2018–June 2025) developing several production e-commerce sites. I own problems end to end and partner very well with product owners. I&apos;m a force stack multiplier in small teams, especially when I have leeway to move fast and drill deep.
				</p>
			</section>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Experience
				</h2>

				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Full-stack Developer
						</span>
						<span className="cv-job-dates">
							Jan 2024 – Jun 2025 · 1 yr 6 mos
						</span>
					</div>
					<div className="cv-job-company">
						Lumber Marketplace · Full-time
					</div>
					<div className="cv-job-meta">
						Remote · Columbia, TN
					</div>
					<ul>
						<li>
							Built a custom, industry-specific regex synthesis engine and library for raw textual data processing, inventory upload, and search keyword harvesting.
						</li>
						<li>
							Built Prisma generators that synthesized class suites (DTOs, entities, validators, Swagger) for every model, plus helpers to coerce DTO data into Prisma clauses.
						</li>
						<li>
							Rebuilt a poorly implemented core Product feature on frontend and backend.
						</li>
						<li>
							Wrote Bash scripts and a companion API for PostgreSQL backups, live-data debugging, and admin operations.
						</li>
						<li>
							Worked without a CTO, reporting to the owners. I showed ownership and initiative that compensated for the team’s lack of technical direction.
						</li>
						<li>
							Delivered hotfixes for site-breaking issues and unblocked teammates after earlier project-direction changes.
						</li>
					</ul>
				</div>

				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Senior Application Developer
						</span>
						<span className="cv-job-dates">
							Nov 2018 – Nov 2023 · 5 yrs 1 mo
						</span>
					</div>
					<div className="cv-job-company">
						GO Green Enterprises · Full-time
					</div>
					<div className="cv-job-meta">
						South West Utah · On-site
					</div>
					<ul>
						<li>
							Senior developer on web applications including plumbersstock.com, adamsandco.net, and swplumbing.com (PHP/Laravel, JavaScript, CSS, jQuery).
						</li>
						<li>
							Sole/lead developer for adamsandco.net and in-house iOS order processing app (Swift, SQLite).
						</li>
						<li>
							Sole/lead developer for in-house and third-party search (Elasticsearch, Unbxd). Junior server admin (Apache/Ubuntu, Bash) and junior database admin (MySQL, MongoDB).
						</li>
						<li>
							Helped establish pull-request culture; routinely mentored junior developers. Also used Dart/Flutter, TypeScript, Node.js, and React during this period.
						</li>
						<li>
							Maintained decades-old production systems that the company still depended on.
						</li>
					</ul>
				</div>

				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Tech Support
						</span>
						<span className="cv-job-dates">
							Mar 2016 – Oct 2017 · 1 yr 7 mos
						</span>
					</div>
					<div className="cv-job-company">
						Infowest Inc.
					</div>
					<div className="cv-job-meta">
						Cedar City, UT
					</div>
					<ul>
						<li>
							Troubleshot Ubiquiti wireless ISP equipment at customer and tower levels; multi-brand router setup, PPPoE, IMAP/POP email, VoIP ATA.
						</li>
						<li>
							Built an internal troubleshooting flow app (WISP-T) that reached beta.
						</li>
					</ul>
				</div>
			</section>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Additional Experience
				</h2>
				<table className="cv-additional">
					<tbody>
						<tr>
							<td>
								<div>
									Door Builder
								</div>
								<div className="cv-additional-org">
									Timberline Cabinets · Express Employment Professionals
								</div>
							</td>
							<td>
								Cut, ripped, drilled, banded, assembled, ran CNC, cleaned, and palletized cabinet doors; color matching and shop problem-solving.
							</td>
							<td>
								Jul 2026 – Sep 2026 · 3 mos
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Team Member
								</div>
								<div className="cv-additional-org">
									Burger King · New Era Management, LLC
								</div>
							</td>
							<td>
								Drive-through, front counter, cash handling, fryers, quality control, and expediting. C-suite commendation for drive-through customer service; began management training.
							</td>
							<td>
								Aug 2025 – May 2026 · 10 mos
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Territory Sales Lead
								</div>
								<div className="cv-additional-org">
									Anderson Merchandisers
								</div>
							</td>
							<td>
								Delegation and deadline management across two Walmart locations
							</td>
							<td>
								Jul–Nov 2018
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Smart Secure Specialist
								</div>
								<div className="cv-additional-org">
									Vivint Smart Home
								</div>
							</td>
							<td>
								Inbound tech support for smart home and security systems
							</td>
							<td>
								Oct–Dec 2017
							</td>
						</tr>
						<tr>
							<td>
								<div>
									House Manager
								</div>
								<div className="cv-additional-org">
									Utah Shakespeare Festival
								</div>
							</td>
							<td>
								Paid house management; guest experience, ushers, seating, and accessibility
							</td>
							<td>
								Jun–Nov 2015
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Dishwasher
								</div>
								<div className="cv-additional-org">
									Centro&apos;s Woodfired Pizza
								</div>
							</td>
							<td>
								Washed dishes, glassware, utensils, and cookware by hand and/or using commercial dishwashing equipment; maintained cleanliness of the dish pit, kitchen, and related areas; assisted with basic prep, restocking, and general kitchen support as needed; ensured compliance with health and safety standards for food-service sanitation
							</td>
							<td>
								May–August 2015
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Customer Service Representative
								</div>
								<div className="cv-additional-org">
									Convergys
								</div>
							</td>
							<td>
								Inbound Cingular and AT&amp;T cell-phone and billing support; payments and account administration
							</td>
							<td>
								2014
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Sales Associate
								</div>
								<div className="cv-additional-org">
									Local Verifications
								</div>
							</td>
							<td>
								Inbound and outbound calls expanding Google Places profiles; sales and marketing
							</td>
							<td>
								2014
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Sales Representative
								</div>
								<div className="cv-additional-org">
									Gateway Management Group
								</div>
							</td>
							<td>
								Ranked #1 nationally for installs; trained junior reps
							</td>
							<td>
								Oct 2013–Jun 2014
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Salesman / Cashier
								</div>
								<div className="cv-additional-org">
									Gap Inc. / Old Navy
								</div>
							</td>
							<td>
								Floor sales, checkout, and restocking in Chico, CA
							</td>
							<td>
								Oct 2012–Jan 2013
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Dishwasher / Floor man
								</div>
								<div className="cv-additional-org">
									Chartwells
								</div>
							</td>
							<td>
								Dish area and closing the cafeteria
							</td>
							<td>
								2012
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Education
				</h2>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Technical Certificate, Computer Science
						</span>
						<span className="cv-job-dates">
							2016–2018
						</span>
					</div>
					<div className="cv-job-company">
						Southwest Applied Technology College (now Southwest Technical College)
					</div>
					<div className="cv-job-meta">
						Cedar City, UT
					</div>
					<ul>
						<li>
							Certified proficiency in C++, Python, Java, and Swift.
						</li>
					</ul>
				</div>
			</section>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Extracurriculars
				</h2>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Glen Guglia
						</span>
						<span className="cv-job-dates">
							Late 2015 – early 2016
						</span>
					</div>
					<div className="cv-job-company">
						<em>
							The Wedding Singer
						</em>
						{' '}
						· Cedar Valley Community Theatre
					</div>
					<ul>
						<li>
							Played Glen Guglia; production photos:
							{' '}
							<a
								href="https://utahtheatrebloggers.com/22772/something-to-celebrate-at-the-wedding-singer"
								target="_blank"
								rel="noopener noreferrer"
							>
								Utah Theatre Bloggers
							</a>
							{' '}
							·
							{' '}
							<a
								href="https://www.cvct.online/projects-7-6"
								target="_blank"
								rel="noopener noreferrer"
							>
								CVCT
							</a>
						</li>
					</ul>
				</div>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Billy Crocker (lead)
						</span>
						<span className="cv-job-dates">
							Jul–Aug 2013
						</span>
					</div>
					<div className="cv-job-company">
						<em>
							Anything Goes
						</em>
						{' '}
						· Chico Theater Company
					</div>
					<ul>
						<li>
							Lead role as Billy Crocker; press:
							{' '}
							<a
								href="https://www.timesheraldonline.com/2013/07/18/anything-goes-at-chico-theater/"
								target="_blank"
								rel="noopener noreferrer"
							>
								Times Herald Online
							</a>
						</li>
					</ul>
				</div>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Marius (lead)
						</span>
						<span className="cv-job-dates">
							Oct 2013
						</span>
					</div>
					<div className="cv-job-company">
						<em>
							Les Misérables
						</em>
						{' '}
						· California Regional Theatre
					</div>
					<ul>
						<li>
							Lead role as Marius; press:
							{' '}
							<a
								href="https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-miserables/"
								target="_blank"
								rel="noopener noreferrer"
							>
								Chico Enterprise-Record
							</a>
							{' '}
							(
							<a
								href="https://web.archive.org/web/20240408180702/https://www.chicoer.com/2013/10/10/french-revolution-experienced-in-les-miserables/"
								target="_blank"
								rel="noopener noreferrer"
							>
								archive
							</a>
							)
						</li>
					</ul>
				</div>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							John and Jesus
						</span>
						<span className="cv-job-dates">
							2011
						</span>
					</div>
					<div className="cv-job-company">
						<em>
							John, His Story
						</em>
						{' '}
						· Simpson University Drama Club
					</div>
					<ul>
						<li>
							Roles as John and Jesus; video:
							{' '}
							<a
								href="https://www.youtube.com/playlist?list=PL02749288672392F2"
								target="_blank"
								rel="noopener noreferrer"
							>
								YouTube playlist
							</a>
						</li>
					</ul>
				</div>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Petruchio
						</span>
						<span className="cv-job-dates">
							2011
						</span>
					</div>
					<div className="cv-job-company">
						<em>
							The Taming of the Shrew
						</em>
						{' '}
						· Simpson University Drama Club
					</div>
					<ul>
						<li>
							Role as Petruchio; video:
							{' '}
							<a
								href="https://www.youtube.com/playlist?list=PLF38A98137436629F"
								target="_blank"
								rel="noopener noreferrer"
							>
								YouTube playlist
							</a>
						</li>
					</ul>
				</div>
				<table className="cv-additional">
					<tbody>
						<tr>
							<td>
								<div>
									Warehouse Volunteer
								</div>
								<div className="cv-additional-org">
									Iron County Care and Share
								</div>
							</td>
							<td>
								Stock and Sort: food warehouse sorting, restocking, and prep for group volunteers (Wednesdays 3–5 pm, Cedar City / Enoch)
							</td>
							<td>
								2018
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Usher
								</div>
								<div className="cv-additional-org">
									Utah Shakespeare Festival
								</div>
							</td>
							<td>
								Volunteered as usher for multiple seasons before and after the paid House Manager role, including 2016 and 2017
							</td>
							<td>
								2016–2017
							</td>
						</tr>
						<tr>
							<td>
								<div>
									High school choir
								</div>
							</td>
							<td>
								Madrigals, a cappella, and Sac Street Boys
							</td>
							<td>
								High school
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Choir tours
								</div>
							</td>
							<td>
								New York City and San Francisco (2007, 2009); Portland, Seattle, and Northwest coast (2010–2012) — high school and college
							</td>
							<td>
								2007–2012
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Drama Club President
								</div>
								<div className="cv-additional-org">
									Simpson University
								</div>
							</td>
							<td>
								President (2011); Vice-President (2010)
							</td>
							<td>
								2010–2011
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Theater & Worship leadership
								</div>
								<div className="cv-additional-org">
									Campus City Connection
								</div>
							</td>
							<td>
								Leadership in Theater and Worship; drama team including script writing into early 2013
							</td>
							<td>
								2012–2013
							</td>
						</tr>
						<tr>
							<td>
								<div>
									Community service
								</div>
								<div className="cv-additional-org">
									Campus City Connection
								</div>
							</td>
							<td>
								Weekly food service to the homeless (2012); Torres Shelter cooking and serving for ~65 people (Dec 2013); comedy night fundraiser for an Africa missions trip (2011)
							</td>
							<td>
								2011–2013
							</td>
						</tr>
					</tbody>
				</table>
			</section>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Skills
				</h2>
				<div className="cv-skills-grid">
					<div className="cv-skill-group">
						<div className="cv-skill-label">
							Frontend
						</div>
						<div className="cv-skill-list">
							Next.js, React, TypeScript, Tailwind CSS, MUI, HTML5, CSS3
						</div>
					</div>
					<div className="cv-skill-group">
						<div className="cv-skill-label">
							Backend
						</div>
						<div className="cv-skill-list">
							Node.js, NestJS (Nest.js), PHP, Laravel, REST APIs, Prisma
						</div>
					</div>
					<div className="cv-skill-group">
						<div className="cv-skill-label">
							Data & search
						</div>
						<div className="cv-skill-list">
							PostgreSQL (Postgres), MySQL, MongoDB, Elasticsearch, OpenSearch
						</div>
					</div>
					<div className="cv-skill-group">
						<div className="cv-skill-label">
							Mobile
						</div>
						<div className="cv-skill-list">
							Swift (iOS), SQLite, Dart/Flutter (used at GO Green)
						</div>
					</div>
					<div className="cv-skill-group">
						<div className="cv-skill-label">
							Infrastructure
						</div>
						<div className="cv-skill-list">
							AWS, Ubuntu, Apache, Bash, Git, CI/CD
						</div>
					</div>
					<div className="cv-skill-group">
						<div className="cv-skill-label">
							How I work
						</div>
						<div className="cv-skill-list">
							Unsupervised ownership, product-owner communication, junior mentorship, production incident response.
						</div>
					</div>
				</div>
			</section>
		</div>
	);
}
