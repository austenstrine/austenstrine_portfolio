'use client';

import type { ReactNode } from 'react';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { CopyIcon } from '../icons/CopyIcon';

type ContactMethodRowProps = {
	rowId?: string;
	copyLabel: string;
	copyValue: string;
	href: string;
	linkTitle: string;
	linkSummary: string;
	icon: ReactNode;
	onCopied: () => void;
};

function mobileActionValue(href: string, copyValue: string): string {
	if(href.startsWith('http://') || href.startsWith('https://')) {
		try {
			const path = new URL(href).pathname.replace(/\/$/, '');
			if(path) {
				return path;
			}
		}
		catch {
			return copyValue;
		}
	}

	if(href.startsWith('/') && !href.startsWith('//')) {
		return href;
	}

	return copyValue;
}

export function ContactMethodRow({
	rowId,
	copyLabel,
	copyValue,
	href,
	linkTitle,
	linkSummary,
	icon,
	onCopied,
}: ContactMethodRowProps) {
	const isExternal = href.startsWith('http');
	const linkTarget = isExternal
		? '_blank'
		: undefined;
	const linkRel = isExternal
		? 'noreferrer'
		: undefined;
	const actionValue = mobileActionValue(href, copyValue);

	const onCopy = async () => {
		try {
			await navigator.clipboard.writeText(copyValue);
			onCopied();
		}
		catch {
			return;
		}
	};

	return (
		<div
			className="
				flex
				items-stretch
				gap-3
			"
			id={rowId}
		>
			<div
				className="
					relative
					shrink-0
					self-stretch
					md:min-w-0
					md:flex-1
				"
			>
				<button
					className="
						group
						inline-flex
						h-full
						w-12
						items-center
						justify-center
						rounded-xl
						border
						border-white/20
						bg-white/10
						text-slate-100
						transition
						hover:bg-white/20
						hover:text-white
						md:h-auto
						md:w-auto
						md:max-w-full
						md:justify-start
						md:gap-3
						md:rounded-none
						md:border-0
						md:bg-transparent
						md:px-1
						md:py-2
						md:text-left
						md:hover:bg-transparent
						md:hover:opacity-90
					"
					type="button"
					onClick={onCopy}
					aria-label={`Copy ${copyLabel} to clipboard`}
				>
					<span
						className="
							shrink-0
							text-slate-100
							md:hidden
						"
						aria-hidden="true"
					>
						<CopyIcon />
					</span>
					<div
						className="
							hidden
							min-w-0
							md:block
						"
					>
						<p
							className="
								text-[11px]
								font-semibold
								uppercase
								tracking-wide
								leading-none
								text-slate-300
							"
						>
							{copyLabel}
						</p>
						<div
							className="
								flex
								items-center
								justify-between
								gap-2
							"
						>
							<p
								className="
									min-w-0
									truncate
									text-sm
									text-slate-100
								"
							>
								{copyValue}
							</p>
							<span
								className="
									shrink-0
									text-slate-200
									opacity-0
									transition
									group-hover:opacity-100
									group-hover:text-white
									group-focus-visible:opacity-100
								"
								aria-hidden="true"
							>
								<CopyIcon />
							</span>
						</div>
					</div>
				</button>
			</div>

			<a
				className="
					group
					flex
					min-w-0
					flex-1
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
				href={href}
				target={linkTarget}
				rel={linkRel}
			>
				<div
					className="
						flex
						min-w-0
						items-center
						gap-3
						md:justify-start
					"
				>
					<span
						className="
							shrink-0
							rounded-md
							bg-white/15
							p-2
						"
					>
						{icon}
					</span>
					<div className="min-w-0 text-left">
						<p className="font-semibold truncate">
							{linkTitle}
						</p>
						<p
							className="
								truncate
								text-sm
								text-slate-200
								md:hidden
							"
						>
							{actionValue}
						</p>
						<p
							className="
								hidden
								text-sm
								text-slate-200
								md:block
							"
						>
							{linkSummary}
						</p>
					</div>
				</div>
				<span
					className="
						ml-2
						shrink-0
						transition
						group-hover:translate-x-0.5
					"
					aria-hidden="true"
				>
					<ArrowRightIcon
						className="h-5 w-5"
					/>
				</span>
			</a>
		</div>
	);
}
