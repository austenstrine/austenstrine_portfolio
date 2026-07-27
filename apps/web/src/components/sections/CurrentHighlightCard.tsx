import type { ReactNode } from 'react';

type CurrentHighlightAction = {
	label: string;
	href: string;
	variant?: 'solid' | 'outline';
};

export type CurrentHighlightBody = {
	title: string;
	detail: string;
	stackId?: string;
	stackTitle: string;
	stackItems: string[];
	notes: string[];
	actions: CurrentHighlightAction[];
};

type CurrentHighlightCardProps = {
	body: CurrentHighlightBody;
	showWrapper?: boolean;
	onClose?: () => void;
	children?: ReactNode;
};

export function CurrentHighlightCard({
	body,
	showWrapper = true,
	onClose,
	children,
}: CurrentHighlightCardProps) {
	if (!showWrapper) {
		return <>{children}</>;
	}

	return (
		<div
			className="
				relative
				-mx-4
				rounded-2xl
				bg-gradient-to-br
				from-ink
				via-sky
				to-emerald-800
				p-4
				text-white
				shadow-xl
			"
		>
			{
				onClose && (
					<button
						type="button"
						onClick={onClose}
						aria-label="Disable current highlight"
						className="absolute right-3 top-3 rounded-full border border-white/25 bg-white/10 p-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
					>
						<span aria-hidden="true" className="block text-sm leading-none">
							×
						</span>
					</button>
				)
			}

			<p
				className="
					text-xs
					font-semibold
					uppercase
					tracking-[0.22em]
					text-slate-100
				"
			>
				Current highlight
			</p>

			{
				children && (
					<div className="mt-3">
						{children}
					</div>
				)
			}

			<h3
				className="
					mt-4
					text-2xl
					font-semibold
				"
			>
				{body.title}
			</h3>
			<p
				className="
					mt-3
					text-sm
					leading-6
					text-slate-100
				"
			>
				{body.detail}
			</p>

			<div
				id={body.stackId}
				className="
					mt-5
					rounded-xl
					border
					border-white/20
					bg-white/10
					p-4
				"
			>
				<p
					className="
						text-[11px]
						font-semibold
						uppercase
						tracking-[0.18em]
						text-slate-100
					"
				>
					{body.stackTitle}
				</p>
				<div
					className="
						mt-3
						flex
						flex-wrap
						gap-2
					"
				>
					{
						body.stackItems.map((item) => (
							<span
								key={item}
								className="
									rounded-full
									bg-white/15
									px-3
									py-1
									text-xs
									font-medium
									text-white
								"
							>
								{item}
							</span>
						))
					}
				</div>
			</div>

			<div className="mt-5 space-y-2 text-sm text-slate-100">
				{
					body.notes.map((note) => (
						<p key={note}>
							{note}
						</p>
					))
				}
			</div>

			<div
				className="
					mt-6
					flex
					flex-wrap
					gap-3
				"
			>
				{
					body.actions.map((action) => (
						<a
							key={action.href}
							href={action.href}
							target="_blank"
							rel="noreferrer"
							className={
								(action.variant === 'outline'
									? 'rounded-full border border-white/30 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10'
									: 'rounded-full bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:-translate-y-0.5 hover:bg-frost'
								)
							}
						>
							{action.label}
						</a>
					))
				}
			</div>
		</div>
	);
}
