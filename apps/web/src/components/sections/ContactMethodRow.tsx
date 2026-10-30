'use client';

import { useCallback, type ReactNode } from 'react';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { CopyIcon } from '../icons/CopyIcon';

type ContactMethodRowProps = {
	copyLabel: string;
	copyValue: string;
	href: string;
	icon: ReactNode;
	linkSummary: string;
	linkTitle: string;
	mobileSummary: string;
	onCopied: () => void;
	rowId?: string;
};

export function ContactMethodRow({
	copyLabel,
	copyValue,
	href,
	icon,
	linkSummary,
	linkTitle,
	mobileSummary,
	onCopied,
	rowId,
}: ContactMethodRowProps) {
	const copyId = `${rowId ?? copyLabel}-copy`;
	const isExternal = href.startsWith('http');
	const displayValue = copyValue.replace(/^https?:\/\//, '');

	const copyValueToClipboard = useCallback(async() => {
		try {
			await navigator.clipboard.writeText(copyValue);
			onCopied();
		} catch{
			window.prompt(
				`Copy ${copyLabel}`,
				copyValue,
			);
		}
	}, [copyLabel, copyValue, onCopied]);

	return (
		<div
			className="
				max-md:contents
				md:grid
				md:grid-cols-[minmax(0,1fr),minmax(0,1fr)]
				md:gap-3
			"
			id={rowId}
		>
			<div className="md:min-w-0">
				<button
					aria-label={`Copy ${copyLabel} to clipboard`}
					className="
						group
						inline-flex
						h-full
						min-h-14
						w-full
						flex-col
						items-center
						justify-center
						gap-1
						py-3
						pl-0
						text-center
						transition
						hover:opacity-90
						md:w-auto
						md:min-h-0
						md:flex-row
						md:items-center
						md:justify-start
						md:gap-2
						md:px-1
						md:py-2
						md:text-left
					"
					id={copyId}
					onClick={copyValueToClipboard}
					type="button"
				>
					<span className="min-w-0 md:text-left">
						<span
							className="
								block
								text-[10px]
								font-semibold
								uppercase
								tracking-[0.18em]
								text-slate-300
							"
						>
							{copyLabel}
						</span>
						<span
							className="
								mt-0.5
								hidden
								truncate
								text-sm
								text-white
								md:block
							"
						>
							{displayValue}
						</span>
					</span>
					<CopyIcon
						className="
							h-4
							w-4
							shrink-0
							text-slate-300
							opacity-70
							transition
							group-hover:opacity-100
						"
					/>
				</button>
			</div>
			<a
				aria-describedby={copyId}
				className="
					group
					flex
					min-w-0
					flex-1
					items-center
					justify-between
					gap-4
					rounded-2xl
					border
					border-white/10
					bg-white/5
					px-4
					py-4
					transition
					hover:bg-white/10
				"
				href={href}
				rel={
					isExternal
						? 'noreferrer'
						: undefined
				}
				target={
					isExternal
						? '_blank'
						: undefined
				}
			>
				<span
					className="
						relative
						z-10
						flex
						min-w-0
						items-center
						gap-3
						overflow-visible
					"
				>
					<span
						className="
							flex
							h-10
							w-10
							shrink-0
							items-center
							justify-center
							rounded-full
							bg-white/10
							text-white
						"
					>
						{icon}
					</span>
					<span className="min-w-0 overflow-visible">
						<span
							className="
								block
								font-semibold
							"
						>
							{linkTitle}
						</span>
						<span
							className="
								block
								overflow-visible
								whitespace-nowrap
								text-sm
								text-slate-300
								md:hidden
							"
						>
							{mobileSummary}
						</span>
						<span
							className="
								hidden
								truncate
								text-sm
								text-slate-300
								md:block
							"
						>
							{linkSummary}
						</span>
					</span>
				</span>
				<ArrowRightIcon
					className="
						h-4
						w-4
						shrink-0
						text-slate-300
						transition
						group-hover:translate-x-0.5
					"
				/>
			</a>
		</div>
	);
}
