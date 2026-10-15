'use client';

import {
	WALKTHROUGH_MACROS,
	currentMacro,
	macroIndex,
	nextMacro,
	type WalkthroughMacroStep,
} from '../../lib/walkthrough';

type TutorialBannerProps = {
	step: WalkthroughMacroStep;
	onSkip?: () => void;
};

export function TutorialBanner({ step, onSkip }: TutorialBannerProps) {
	const current = currentMacro(step);
	const upcoming = nextMacro(step);
	const index = macroIndex(step);

	return (
		<div
			className="
				sticky
				top-0
				z-40
				mb-6
				overflow-hidden
				rounded-2xl
				border
				border-sky/30
				bg-gradient-to-br
				from-slate-900
				via-slate-800
				to-sky/40
				text-white
				shadow-lg
				shadow-slate-900/20
			"
		>
			<div
				className="
					flex
					flex-wrap
					items-start
					justify-between
					gap-4
					px-5
					py-4
				"
			>
				<div className="min-w-0 flex-1">
					<p
						className="
							text-[11px]
							font-semibold
							uppercase
							tracking-[0.24em]
							text-sky-200
						"
					>
						Walkthrough · Step {index + 1} of {WALKTHROUGH_MACROS.length}
					</p>
					<div
						className="
							mt-2
							flex
							flex-wrap
							items-baseline
							gap-x-3
							gap-y-1
						"
					>
						<h2
							className="
								text-xl
								font-semibold
								tracking-tight
							"
						>
							{current.label}
						</h2>
						{upcoming
							? (
									<p className="text-sm text-slate-300">
										Next:{' '}
										<span className="font-medium text-white">
											{upcoming.label}
										</span>
									</p>
								)
							: (
									<p className="text-sm text-emerald-200">
										Final step — you are almost done.
									</p>
								)}
					</div>
					<p
						className="
							mt-1
							max-w-2xl
							text-sm
							text-slate-300
						"
					>
						{current.hint}
					</p>
				</div>
				{onSkip
					? (
							<button
								className="
									shrink-0
									text-xs
									font-semibold
									uppercase
									tracking-wide
									text-slate-300
									hover:text-white
								"
								type="button"
								onClick={onSkip}
							>
								Skip guide
							</button>
						)
					: null}
			</div>

			<div
				className="
					flex
					gap-1.5
					px-5
					pb-4
				"
			>
				{WALKTHROUGH_MACROS.map((macro, macroIndexValue) => {
					const done = macroIndexValue < index;
					const active = macro.id === step;
					return (
						<div
							className={
								active
									? 'h-1.5 flex-1 rounded-full bg-sky'
									: done
										? 'h-1.5 flex-1 rounded-full bg-emerald-400/80'
										: 'h-1.5 flex-1 rounded-full bg-white/20'
							}
							key={macro.id}
							title={macro.label}
						/>
					);
				})}
			</div>
		</div>
	);
}
