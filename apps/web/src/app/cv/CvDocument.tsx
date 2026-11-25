import {
	CV_CERTIFICATES,
	CV_SKILL_GROUPS,
	CV_SUMMARY_PARAGRAPHS,
} from '../../data/cv-content';
import { recommendations } from '../../data/recommendations';
import {
	SITE_EMAIL,
	SITE_GITHUB,
	SITE_HEADLINE,
	SITE_LINKEDIN,
	SITE_NAME,
	SITE_OG_IMAGE,
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
				<div className="cv-header-main">
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
								relocating full-time January 2027
							</span>
						</p>
					</div>
				</div>
				<img
					className="cv-photo"
					src={SITE_OG_IMAGE}
					alt={SITE_NAME}
					width={112}
					height={112}
				/>
			</header>

			<section className="cv-section cv-summary">
				<h2 className="cv-section-title">
					Summary
				</h2>
				{CV_SUMMARY_PARAGRAPHS.map((paragraph) => (
					<p key={paragraph.slice(0, 48)}>
						{paragraph}
					</p>
				))}
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
							Rebuilt the core Product feature on frontend and backend.
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
							Sole/lead developer for in-house and third-party search (Elasticsearch, Unbxd): normalized plumbersstock.com product data into the Unbxd API; kept the Unbxd integration script updated, functional, and compatible with other site scripts after the team moved plumbersstock.com search off a prior in-house Elasticsearch implementation.
						</li>
						<li>
							Previous search coworker trained him on Elasticsearch before leaving; then inherited Elasticsearch and Unbxd ownership; kept Elasticsearch working regularly and reliably for sites such as adamsandco.net so it stayed stable and fast.
						</li>
						<li>
							Built reporting tools that used Elasticsearch indexes to pull sales and inventory data and visualize them with Chart.js.
						</li>
						<li>
							Junior server admin (Apache/Ubuntu, Bash) and junior database admin (MySQL, MongoDB). Helped establish pull-request culture; routinely mentored junior developers.
						</li>
						<li>
							Migrated plumbersstock.com MongoDB product data from abandoned zizaco/mongolid (ext-mongo only) to leroy-merlin-br/mongolid by wrapping the new ODM in a light zizaco-like layer so the Laravel app could upgrade PHP without rewriting every mongolid-style call (jenssegers/mongodb was not an option).
						</li>
						<li>
							Optimized that ODM wrapper’s document access (including optional select-style retrieval) to about 9× the original zizaco performance, though it still didn’t really compete with MySQL for speed; MySQL was a messy Epicor Eclipse dump/CSV copy of a copy of the source of truth.
						</li>
						<li>
							Fixed a widespread Laravel app() helper pattern that constructed a heavy default instance on every class lookup by adding a static singleton (with -&gt;fresh() for a new instance; later cheap clones); measured about 20% aggregate backend speedup and built a benchmark/logging suite to prove it.
						</li>
						<li>
							Built a Redis cache ORM (remember/set/get/delete) that sped up certain pages by about 5×–7×.
						</li>
						<li>
							On adamsandco.net: built a session click-recorder admin tool so CRM could view customer sessions and click paths to see what customers may have been doing wrong and diagnose issues customers could not describe—including reports days after the fact.
						</li>
						<li>
							On adamsandco.net: built an admin tool for seasonal homepage layout and content changes so staff no longer needed a programmer ~9+ times a year.
						</li>
						<li>
							On plumbersstock.com: built a system to push a cookie/session clear to clients so stale cookie or session problems could be wiped before they caused issues.
						</li>
						<li>
							Also used Dart/Flutter, TypeScript, Node.js, and React during this period.
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

			<div className="cv-edu-skills">
				<section className="cv-section cv-section--education">
					<h2 className="cv-section-title">
						Education
					</h2>
					{CV_CERTIFICATES.map((certificate) => (
						<div
							className="cv-job"
							key={certificate.title}
						>
							<div className="cv-job-header">
								<span className="cv-job-title">
									{certificate.title}
								</span>
								{certificate.dates
									? (
										<span className="cv-job-dates">
											{certificate.dates}
										</span>
									)
									: null}
							</div>
							<div className="cv-job-company">
								{certificate.org}
							</div>
							{certificate.location
								? (
									<div className="cv-job-meta">
										{certificate.location}
									</div>
								)
								: null}
							{certificate.bullets.length > 0
								? (
									<ul>
										{certificate.bullets.map((bullet) => (
											<li key={bullet}>
												{bullet}
											</li>
										))}
									</ul>
								)
								: null}
						</div>
					))}
				</section>
				<section className="cv-section cv-section--skills">
					<h2 className="cv-section-title">
						Skills
					</h2>
					<div className="cv-skills-grid">
						{CV_SKILL_GROUPS.map((group) => (
							<div
								className="cv-skill-group"
								key={group.label}
							>
								<div className="cv-skill-label">
									{group.label}
								</div>
								<div className="cv-skill-list">
									{group.list}
								</div>
							</div>
						))}
					</div>
				</section>
			</div>

			<section className="cv-section">
				<h2 className="cv-section-title">
					Extracurriculars
				</h2>
				<div className="cv-job">
					<div className="cv-job-header">
						<span className="cv-job-title">
							Mentor / Cast Member
						</span>
						<span className="cv-job-dates">
							December 2023
						</span>
					</div>
					<div className="cv-job-company">
						<em>
							White Christmas
						</em>
						{' '}
						· IMPAC
					</div>
					<div className="cv-job-meta">
						Cedar City
					</div>
					<ul>
						<li>
							Paid mentor and cast member in a dual-performance production (mentors-only and mentees-only cast). Event:
							{' '}
							<a
								href="https://events.humanitix.com/white-christmas-at-impac-student-cast"
								target="_blank"
								rel="noopener noreferrer"
							>
								Humanitix
							</a>
						</li>
						<li>
							Roles: Mike; Ed Sullivan Announcer; Train Conductor; Varius Ensemble.
						</li>
						<li>
							Guided the acting technique, character development, and performance skills of my mentee; it was an outstanding production and a successful educational experience.
						</li>
					</ul>
				</div>
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
								<div className="cv-additional-org">
									Chico Sr. High School
								</div>
							</td>
							<td>
								Sang bass and baritone in Madrigals, a cappella, and Sac Street Boys
							</td>
							<td>
								2005–2009
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
					Recommendations
				</h2>
				{recommendations.map((recommendation) => {
					const paragraphs = recommendation.text
						.split('\n')
						.filter(Boolean);
					const linkedInHandle = recommendation.profileUrl
						.replace(/^https?:\/\//, '')
						.replace(/^www\./, '')
						.replace(/\/$/, '');

					return (
						<article
							className="cv-recommendation"
							key={recommendation.name}
						>
							<div className="cv-recommendation-header">
								<div>
									<a
										className="cv-recommendation-name"
										href={recommendation.profileUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										{recommendation.name}
									</a>
									<div className="cv-recommendation-meta">
										{recommendation.headline}
										{' · '}
										{recommendation.relationship}
										{' · '}
										{recommendation.date}
									</div>
									<a
										className="cv-recommendation-profile"
										href={recommendation.profileUrl}
										target="_blank"
										rel="noopener noreferrer"
									>
										{linkedInHandle}
									</a>
								</div>
							</div>
							{paragraphs.map((paragraph) => (
								<p key={paragraph.slice(0, 48)}>
									{paragraph}
								</p>
							))}
						</article>
					);
				})}
			</section>
		</div>
	);
}
