'use client';

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { DocumentIcon } from '../icons/DocumentIcon';
import { EmailIcon } from '../icons/EmailIcon';
import { GithubIcon } from '../icons/GithubIcon';
import { LinkedInIcon } from '../icons/LinkedInIcon';
import { PhoneIcon } from '../icons/PhoneIcon';
import { SITE_EMAIL, SITE_PHONE, SITE_PHONE_HREF } from '../../lib/site';
import { ContactMethodRow } from './ContactMethodRow';

type ContactMethod = {
	rowId?: string;
	copyLabel: string;
	copyValue: string;
	href: string;
	linkTitle: string;
	linkSummary: string;
	icon: ReactNode;
};

const methods: ContactMethod[] = [
	{
		copyLabel: 'Email',
		copyValue: SITE_EMAIL,
		href: `mailto:${SITE_EMAIL}?subject=Portfolio Inquiry`,
		linkTitle: 'Email Me',
		linkSummary: 'Send me a direct email',
		icon: (
			<EmailIcon
				className="h-5 w-5"
			/>
		),
	},
	{
		copyLabel: 'Phone',
		copyValue: SITE_PHONE,
		href: SITE_PHONE_HREF,
		linkTitle: 'Call me',
		linkSummary: 'Reach me by phone',
		icon: (
			<PhoneIcon
				className="h-5 w-5"
			/>
		),
	},
	{
		copyLabel: 'LinkedIn',
		copyValue: 'linkedin.com/in/austen-loren-strine',
		href: 'https://www.linkedin.com/in/austen-loren-strine/',
		linkTitle: 'LinkedIn',
		linkSummary: 'Connect with me professionally',
		icon: (
			<LinkedInIcon
				className="h-5 w-5"
			/>
		),
	},
	{
		copyLabel: 'GitHub',
		copyValue: 'github.com/austenstrine',
		href: 'https://github.com/austenstrine',
		linkTitle: 'GitHub',
		linkSummary: 'Check out my code',
		icon: (
			<GithubIcon
				className="h-5 w-5"
			/>
		),
	},
	{
		rowId: 'contact-cv-row',
		copyLabel: 'CV',
		copyValue: 'austenstrine.dev/cv.html',
		href: '/cv.html',
		linkTitle: 'View CV',
		linkSummary: 'Printable work history',
		icon: (
			<DocumentIcon
				className="h-5 w-5"
			/>
		),
	},
];

export function ContactSection() {
	const [showToast, setShowToast] = useState(false);
	const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const onCopied = () => {
		setShowToast(true);

		if(toastTimeoutRef.current) {
			clearTimeout(toastTimeoutRef.current);
		}

		toastTimeoutRef.current = setTimeout(() => {
			setShowToast(false);
			toastTimeoutRef.current = null;
		}, 1100);
	};

	return (
		<section
			className="
				rounded-2xl
				bg-gradient-to-br
				from-ink
				to-sky
				p-8
				text-white
				shadow-xl
			"
			id="contact"
		>
			<h2 className="text-3xl font-semibold">
				Get in touch
			</h2>
			<p
				className="
					mt-3
					max-w-3xl
					text-slate-200
				"
			>
				I am looking for full-stack engineering work in the Salt Lake Valley. I live
				in Parowan, Utah, I am in Murray Mondays and Tuesdays, and I relocate to
				Murray full-time in December 2026.
			</p>

			<div
				className="
					mt-6
					grid
					gap-3
				"
			>
				{
					methods.map((method) => (
						<ContactMethodRow
							key={method.href}
							rowId={method.rowId}
							copyLabel={method.copyLabel}
							copyValue={method.copyValue}
							href={method.href}
							linkTitle={method.linkTitle}
							linkSummary={method.linkSummary}
							icon={method.icon}
							onCopied={onCopied}
						/>
					))
				}
			</div>

			{
				showToast && (
					<span
						className="
							pointer-events-none
							fixed
							bottom-6
							left-1/2
							z-[70]
							-translate-x-1/2
							whitespace-nowrap
							rounded-md
							bg-black/80
							px-3
							py-1.5
							text-xs
							font-medium
							text-white
							shadow-lg
						"
					>
						Added to clipboard
					</span>
				)
			}
		</section>
	);
}
