'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { ExperienceRole } from '../../data/experience';
import {
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

function PrintRoleArticle({
	role,
}: {
	role: ExperienceRole;
}) {
	return (
		<article className="experience-print-job">
			<div className="experience-print-job-header">
				<span className="experience-print-job-title">
					{role.title}
				</span>
				{role.dates
					? (
						<span className="experience-print-job-dates">
							{role.dates}
						</span>
					)
					: null}
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
	);
}

export function ExperiencePrintSheet({
	roles,
}: {
	roles: ExperienceRole[];
}) {
	const [mounted, setMounted] = useState(false);
	const siteHost = SITE_URL.replace(/^https?:\/\//, '');
	const workRoles = roles.filter((role) => role.category !== 'education');
	const educationRoles = roles.filter((role) => role.category === 'education');
	const closingHasEducation = educationRoles.length > 0;

	useEffect(() => {
		setMounted(true);
	}, []);

	// SSR and first client paint must match (null). Portal only after mount.
	if(!mounted) {
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

			{workRoles.length > 0
				? (
					<section className="experience-print-section">
						<h2>
							Experience
						</h2>
						{workRoles.map((role) => (
							<PrintRoleArticle
								key={role.id}
								role={role}
							/>
						))}
					</section>
				)
				: null}

			<div
				className={
					closingHasEducation
						? 'experience-print-closing experience-print-closing--with-education'
						: 'experience-print-closing'
				}
			>
				{closingHasEducation
					? (
						<section className="experience-print-section">
							<h2>
								Education
							</h2>
							{educationRoles.map((role) => (
								<PrintRoleArticle
									key={role.id}
									role={role}
								/>
							))}
						</section>
					)
					: null}
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
