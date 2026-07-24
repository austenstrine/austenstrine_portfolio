import type { ReactNode } from 'react';
import { CopyField } from '../CopyField';
import { DocumentIcon } from '../icons/DocumentIcon';
import { EmailIcon } from '../icons/EmailIcon';
import { GithubIcon } from '../icons/GithubIcon';
import { LinkedInIcon } from '../icons/LinkedInIcon';

type ContactMethod = {
	href: string;
	title: string;
	summary: string;
	icon: ReactNode;
};

const methods: ContactMethod[] = [
	{
		href: 'mailto:austen.strine.dev@gmail.com?subject=Portfolio Inquiry',
		title: 'Email Me',
		summary: 'Send me a direct email',
		icon: <EmailIcon className="h-5 w-5" />,
	},
	{
		href: 'https://www.linkedin.com/in/austen-loren-strine/',
		title: 'LinkedIn',
		summary: 'Connect with me professionally',
		icon: <LinkedInIcon className="h-5 w-5" />,
	},
	{
		href: 'https://github.com/austenstrine',
		title: 'GitHub',
		summary: 'Check out my code',
		icon: <GithubIcon className="h-5 w-5" />,
	},
	{
		href: '/cv.html',
		title: 'View CV',
		summary: 'Printable full work history',
		icon: <DocumentIcon className="h-5 w-5" />,
	},
];

export function ContactSection() {
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
			<h2
				className="
					text-3xl
					font-semibold
				"
			>
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
					gap-8
					md:grid-cols-2
				"
			>
				<div
					className="
						space-y-3
					"
				>
					<CopyField label="Email" value="austen.strine.dev@gmail.com" />
					<CopyField label="LinkedIn" value="linkedin.com/in/austen-loren-strine" />
					<CopyField label="GitHub" value="github.com/austenstrine" />
				</div>

				<div
					className="
						grid
						gap-3
					"
				>
					{methods.map((method) => (
						<a
							key={method.title}
							href={method.href}
							target={
								method.href.startsWith('http')
									? '_blank'
									: undefined
							}
							rel={
								method.href.startsWith('http')
									? 'noreferrer'
									: undefined
							}
							className="
								group
								flex
								items-center
								justify-between
								rounded-xl
								border
								border-white/20
								bg-white/10
								px-4
								py-3
								transition
								hover:-translate-y-0.5
								hover:bg-white/20
							"
						>
							<div
								className="
									flex
									items-center
									gap-3
								"
							>
								<span
									className="
										rounded-md
										bg-white/15
										p-2
									"
								>
									{method.icon}
								</span>
								<div>
									<p
										className="
											font-semibold
										"
									>
										{method.title}
									</p>
									<p
										className="
											text-sm
											text-slate-200
										"
									>
										{method.summary}
									</p>
								</div>
							</div>
							<span
								className="
									text-xl
									transition
									group-hover:translate-x-0.5
								"
							>
								›
							</span>
						</a>
					))}
				</div>
			</div>
		</section>
	);
}
