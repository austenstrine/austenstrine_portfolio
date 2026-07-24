"use client";

import type { ReactNode } from 'react';
import { useRef, useState } from 'react';
import { DocumentIcon } from '../icons/DocumentIcon';
import { EmailIcon } from '../icons/EmailIcon';
import { GithubIcon } from '../icons/GithubIcon';
import { LinkedInIcon } from '../icons/LinkedInIcon';
import { ContactMethodRow } from './ContactMethodRow';

type ContactMethod = {
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
		copyValue: 'austen.strine.dev@gmail.com',
		href: 'mailto:austen.strine.dev@gmail.com?subject=Portfolio Inquiry',
		linkTitle: 'Email Me',
		linkSummary: 'Send me a direct email',
		icon: (
			<EmailIcon
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
		copyLabel: 'CV',
		copyValue: 'austenstrine.dev/cv.html',
		href: '/cv.html',
		linkTitle: 'View CV',
		linkSummary: 'Printable full work history',
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

		if (toastTimeoutRef.current) {
			clearTimeout(toastTimeoutRef.current);
		}

		toastTimeoutRef.current = setTimeout(() => {
			setShowToast(false);
			toastTimeoutRef.current = null;
		}, 1100);
	};

	return (
		<section
			id="contact"
			className="
				rounded-2xl
				bg-gradient-to-br
				from-ink
				to-sky
				p-8
				text-white
				shadow-xl
			"
		>
			<h2 className="text-3xl font-semibold">
				Get In Touch
			</h2>
			<p
				className="
					mt-3
					max-w-3xl
					text-slate-200
				"
			>
				I am always interested in hearing about new opportunities and projects.
				Whether you have a question or just want to say hi, feel free to reach out.
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
