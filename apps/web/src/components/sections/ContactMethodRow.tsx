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
				grid
				items-stretch
				gap-3
				md:grid-cols-[minmax(0,1fr),minmax(0,1fr)]
			"
			id={rowId}
		>
			<div className="relative">
				<button
					className="
						group
						inline-flex
						max-w-full
						items-center
						justify-start
						gap-3
						px-1
						py-2
						text-left
						transition
						hover:opacity-90
					"
					type="button"
					onClick={onCopy}
					aria-label={`Copy ${copyLabel} to clipboard`}
				>
					<div className="min-w-0">
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
									transition
									opacity-100
									md:opacity-0
									md:group-hover:opacity-100
									md:group-focus-visible:opacity-100
									group-hover:text-white
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
						{icon}
					</span>
					<div>
						<p className="font-semibold">
							{linkTitle}
						</p>
						<p className="text-sm text-slate-200">
							{linkSummary}
						</p>
					</div>
				</div>
				<span
					className="
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
