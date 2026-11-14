import {
	SITE_EMAIL,
	SITE_HEADLINE,
	SITE_NAME,
	SITE_PHONE,
	SITE_URL,
} from '../../lib/site';
import type { ExperienceRole } from '../../data/experience';

export function ExperiencePrintSheet({
	roles,
}: {
	roles: ExperienceRole[];
}) {
	const siteHost = SITE_URL.replace(/^https?:\/\//, '');

	return (
		<div
			aria-hidden="true"
			className="experience-print-sheet"
			id="experience-print-sheet"
		>
			<header className="experience-print-header">
				<h1>
					{SITE_NAME}
				</h1>
				<p className="experience-print-headline">
					{SITE_HEADLINE}
				</p>
				<p className="experience-print-contact">
					{SITE_EMAIL}
					<span aria-hidden="true">
						{' · '}
					</span>
					{SITE_PHONE}
					<span aria-hidden="true">
						{' · '}
					</span>
					{siteHost}
				</p>
			</header>

			<section className="experience-print-section">
				<h2>
					Experience
				</h2>
				{roles.map((role) => (
					<article
						className="experience-print-job"
						key={role.id}
					>
						<div className="experience-print-job-header">
							<span className="experience-print-job-title">
								{role.title}
							</span>
							<span className="experience-print-job-dates">
								{role.dates}
							</span>
						</div>
						<p className="experience-print-job-org">
							{role.organization}
							{role.location
								? ` · ${role.location}`
								: null}
						</p>
						{role.bullets.length > 0
							? (
								<ul>
									{role.bullets.map((bullet) => (
										<li key={bullet}>
											{bullet}
										</li>
									))}
								</ul>
							)
							: null}
					</article>
				))}
			</section>
		</div>
	);
}

export function printSelectedExperience() {
	const root = document.documentElement;
	const cleanup = () => {
		root.classList.remove('experience-print-selection');
		window.removeEventListener('afterprint', cleanup);
	};

	root.classList.add('experience-print-selection');
	window.addEventListener('afterprint', cleanup);
	window.print();

	// Fallback if afterprint never fires (some WebKit builds).
	window.setTimeout(() => {
		if(root.classList.contains('experience-print-selection')) {
			cleanup();
		}
	}, 1000);
}
