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
			const url = new URL(href);
			const path = url.pathname.replace(/\/$/, '');
			const host = url.hostname.replace(/^www\./, '');
			// LinkedIn alone uses the /in/... path form.
			if(host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
				return path || copyValue;
			}
			if(path) {
				return `${host}${path}`;
			}
			return host || copyValue;
		}
		catch {
			return copyValue;
		}
	}

	// Relative hrefs (e.g. CV): show hostname form from copyValue.
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
				min-w-0
				w-full
				items-stretch
				gap-ve-0.75
			"
			id={rowId}
		>
			<div
				className="
					relative
					w-[4.625rem]
					max-w-[4.625rem]
					shrink-0
					self-stretch
					overflow-hidden
					md:w-auto
					md:max-w-none
					md:min-w-0
					md:flex-1
					md:overflow-visible
				"
			>
				<button
					className="
						group
						inline-flex
						h-full
						w-full
						flex-col
						items-center
						justify-center
						gap-ve-0.375
						rounded-xl
						border
						border-white/20
						bg-white/10
						px-ve-0.625
						py-ve-sm
						text-center
						text-slate-100
						transition
						hover:bg-white/20
						hover:text-white
						md:h-auto
						md:w-auto
						md:min-w-0
						md:max-w-full
						md:items-start
						md:justify-start
						md:gap-0
						md:rounded-none
						md:border-0
						md:bg-transparent
						md:px-ve-tiny
						md:py-ve-sm
						md:text-left
						md:hover:bg-transparent
						md:hover:opacity-90
					"
					type="button"
					onClick={onCopy}
					aria-label={`Copy ${copyLabel} to clipboard`}
				>
					<p
						className="
							whitespace-nowrap
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
							items-center
							justify-between
							gap-ve-sm
							md:flex
						"
					>
						<p
							className="
								min-w-0
								overflow-hidden
								truncate
								whitespace-nowrap
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
					px-ve
					py-ve-0.75
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
						gap-ve-0.75
						md:justify-start
					"
				>
					<span
						className="
							shrink-0
							rounded-md
							bg-white/15
							p-ve-sm
						"
					>
						{icon}
					</span>
					<div className="min-w-0 text-left">
						<p
							className="
								truncate
								whitespace-nowrap
								font-semibold
							"
						>
							{linkTitle}
						</p>
						<p
							className="
								overflow-hidden
								truncate
								whitespace-nowrap
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
								overflow-hidden
								truncate
								whitespace-nowrap
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
						ml-ve-sm
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
