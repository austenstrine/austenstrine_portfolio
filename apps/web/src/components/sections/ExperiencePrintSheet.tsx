'use client';

import { createPortal } from 'react-dom';
import type { ExperienceRole } from '../../data/experience';
import {
	CV_CERTIFICATES,
	CV_SKILL_GROUPS,
	CV_SUMMARY_PARAGRAPHS,
} from '../../data/cv-content';
import { printWithDocumentTitle } from '../../lib/print-document';
import {
	SITE_EMAIL,
	SITE_EXPERIENCE_PRINT_TITLE,
	SITE_HEADLINE,
	SITE_NAME,
	SITE_PHONE,
	SITE_URL,
} from '../../lib/site';

export function ExperiencePrintSheet({
	roles,
}: {
	roles: ExperienceRole[];
}) {
	const siteHost = SITE_URL.replace(/^https?:\/\//, '');

	if(typeof document === 'undefined') {
		return null;
	}

	const sheet = (
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
					Summary
				</h2>
				{CV_SUMMARY_PARAGRAPHS.map((paragraph) => (
					<p
						className="experience-print-summary"
						key={paragraph.slice(0, 48)}
					>
						{paragraph}
					</p>
				))}
			</section>

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

			<div className="experience-print-closing">
				<section className="experience-print-section">
					<h2>
						Education
					</h2>
					{CV_CERTIFICATES.map((certificate) => (
						<article
							className="experience-print-job"
							key={certificate.title}
						>
							<div className="experience-print-job-header">
								<span className="experience-print-job-title">
									{certificate.title}
								</span>
								<span className="experience-print-job-dates">
									{certificate.dates}
								</span>
							</div>
							<p className="experience-print-job-org">
								{certificate.org}
								{' · '}
								{certificate.location}
							</p>
							<ul>
								{certificate.bullets.map((bullet) => (
									<li key={bullet}>
										{bullet}
									</li>
								))}
							</ul>
						</article>
					))}
				</section>

				<section className="experience-print-section">
					<h2>
						Skills
					</h2>
					<div className="experience-print-skills">
						{CV_SKILL_GROUPS.map((group) => (
							<div
								className="experience-print-skill-group"
								key={group.label}
							>
								<div className="experience-print-skill-label">
									{group.label}
								</div>
								<div className="experience-print-skill-list">
									{group.list}
								</div>
							</div>
						))}
					</div>
				</section>
			</div>
		</div>
	);

	return createPortal(sheet, document.body);
}

export function printSelectedExperience() {
	const root = document.documentElement;

	printWithDocumentTitle(SITE_EXPERIENCE_PRINT_TITLE, {
		beforePrint: () => {
			root.classList.add('experience-print-selection');
		},
		afterPrint: () => {
			root.classList.remove('experience-print-selection');
		},
	});
}
