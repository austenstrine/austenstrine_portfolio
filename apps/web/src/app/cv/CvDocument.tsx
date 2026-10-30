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
					<p className="cv-contact-row">
						<a href={`mailto:${SITE_EMAIL}`}>
							{SITE_EMAIL}
						</a>
						<span
							className="cv-sep"
							aria-hidden="true"
						>
							·
						</span>
						<a href={SITE_PHONE_HREF}>
							{SITE_PHONE}
						</a>
						<span
							className="cv-sep"
							aria-hidden="true"
						>
							·
						</span>
						<a href={SITE_URL}>
							{siteHost}
						</a>
					</p>
					<p className="cv-contact-row">
						<a
							href={SITE_LINKEDIN}
							target="_blank"
							rel="noopener noreferrer"
						>
							{linkedInPath}
						</a>
						<span
							className="cv-sep"
							aria-hidden="true"
						>
							·
						</span>
						<a
							href={SITE_GITHUB}
							target="_blank"
							rel="noopener noreferrer"
						>
							{githubPath}
						</a>
					</p>
					<p className="cv-location">
						Parowan, UT · Murray Mon/Tue · relocating full-time December 2026
					</p>
				</div>
			</header>

			<section className="cv-section cv-summary">
				<h2 className="cv-section-title">
					Summary
				</h2>
				<p>
					I&apos;m a Senior Product, Catalog, and Search Software Engineer with six and a half years of professional software work (November 2018–June 2025) developing several production e-commerce sites. I work best on small teams where I can own a problem without close supervision and talk plainly with a product owner. I&apos;m as proud of the work that made the people around me faster as I am of what shipped.
				</p>
				<p>
					After Lumber Marketplace in June 2025, I worked as a Burger King team member (August 2025–May 2026) and as a door builder at Timberline Cabinets (July–September 2026), with unemployment between those jobs. I live in Parowan, Utah. I&apos;m in Murray Mondays and Tuesdays, and I&apos;m moving there full-time in December 2026.
				</p>
			</section>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Experience
				</h2>

				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Door Builder
						</span>
						<span className="cv-job-dates">
							Jul 2026 – Sep 2026 · 3 mos
						</span>
					</div>
					<div className="cv-job-company">
						Timberline Cabinets · Express Employment Professionals
					</div>
					<div className="cv-job-meta">
						Cedar City, UT
					</div>
					<ul>
						<li>
							Cut, ripped, drilled, banded, assembled, ran CNC, cleaned, and palletized cabinet doors; color matching and shop problem-solving.
						</li>
					</ul>
				</div>

				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Team Member
						</span>
						<span className="cv-job-dates">
							Aug 2025 – May 2026 · 10 mos
						</span>
					</div>
					<div className="cv-job-company">
						Burger King · New Era Management, LLC
					</div>
					<div className="cv-job-meta">
						Cedar City, UT
					</div>
					<ul>
						<li>
							Drive-through, front counter, cash handling, fryers, quality control, and expediting. C-suite commendation for drive-through customer service; began management training.
						</li>
					</ul>
				</div>

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
							Mar 2016 – Sep 2017 · 1 yr 7 mos
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
							Built an internal troubleshooting flow app (WISP-T) that reached beta — available on GitHub.
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
									House Management
								</div>
								<div className="cv-additional-org">
									Utah Shakespeare Festival
								</div>
							</td>
							<td>
								Guest experience, ushers, seating, and accessibility
							</td>
							<td>
								Jun–Nov 2015
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
