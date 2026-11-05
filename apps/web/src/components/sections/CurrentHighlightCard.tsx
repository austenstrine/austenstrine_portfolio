import type { ReactNode } from 'react';
import { CloseIcon } from '../icons/CloseIcon';

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
	return (
		<div
			className={`
				relative
				transition-[margin]
				duration-300
				ease-out
				${showWrapper
					? '-mx-ve'
					: 'mx-0'
				}
			`}
		>
			<div
				className={`
					pointer-events-none
					absolute
					inset-0
					rounded-2xl
					bg-gradient-to-br
					from-sky
					to-asgreen
					shadow-xl
					transition-opacity
					duration-300
					ease-out
					${showWrapper
						? 'opacity-100'
						: 'opacity-0'
					}
				`}
				aria-hidden="true"
			/>

			{
				onClose && (
					<button
						className={`
							absolute
							right-3
							top-3
							z-10
							rounded-full
							p-ve-0.375
							text-slate-200
							transition-colors
							duration-200
							ease-out
							hover:bg-white/10
							hover:text-white
							focus:outline-none
							focus:ring-2
							focus:ring-white/40
							${showWrapper
								? 'opacity-100'
								: 'pointer-events-none opacity-0'
							}
						`}
						type="button"
						onClick={onClose}
						aria-label="Dismiss current highlight"
						tabIndex={
							(showWrapper
								? 0
								: -1
							)
						}
					>
						<CloseIcon />
					</button>
				)
			}

			<div
				className={`
					relative
					transition-[padding]
					duration-300
					ease-out
					${showWrapper
						? 'p-ve'
						: 'p-0'
					}
				`}
			>
				<div
					className={`
						grid
						transition-[grid-template-rows]
						duration-300
						ease-out
						${showWrapper
							? 'grid-rows-[1fr] opacity-100'
							: 'grid-rows-[0fr] opacity-0'
						}
					`}
					aria-hidden={!showWrapper}
				>
					<div className="overflow-hidden">
						<p
							className={`
								pr-ve-lg
								text-xs
								font-semibold
								uppercase
								tracking-[0.22em]
								text-slate-100
								transition-transform
								duration-300
								ease-out
								${showWrapper
									? 'translate-y-0'
									: '-translate-y-1'
								}
							`}
						>
							Current highlight
						</p>
					</div>
				</div>

				{
					children && (
						<div
							className={`
								transition-[margin-top]
								duration-300
								ease-out
								${showWrapper
									? 'mt-ve-0.75'
									: 'mt-0'
								}
							`}
						>
							{children}
						</div>
					)
				}

				<div
					className={`
						grid
						transition-[grid-template-rows]
						duration-300
						ease-out
						${showWrapper
							? 'grid-rows-[1fr] opacity-100'
							: 'grid-rows-[0fr] opacity-0'
						}
					`}
					aria-hidden={!showWrapper}
				>
					<div className="overflow-hidden">
						<div
							className={`
								transition-transform
								duration-300
								ease-out
								${showWrapper
									? 'translate-y-0'
									: '-translate-y-1'
								}
							`}
						>
							<h3
								className="
									mt-ve
									text-2xl
									font-semibold
									text-white
								"
							>
								{body.title}
							</h3>
							<p
								className="
									mt-ve-0.75
									text-sm
									leading-6
									text-slate-100
								"
							>
								{body.detail}
							</p>

							<div
								className="
									mt-ve-1.25
									rounded-xl
									border
									border-white/20
									bg-white/10
									p-ve
								"
								id={body.stackId}
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
										mt-ve-0.75
										flex
										flex-wrap
										gap-ve-sm
									"
								>
									{
										body.stackItems.map((item) => (
											<span
												className="
													rounded-full
													bg-white/15
													px-ve-0.75
													py-ve-tiny
													text-xs
													font-medium
													text-white
												"
												key={item}
											>
												{item}
											</span>
										))
									}
								</div>
							</div>

							<div
								className="
									mt-ve-1.25
									space-y-ve-sm
									text-sm
									text-slate-100
								"
							>
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
									mt-ve-1.5
									flex
									flex-wrap
									gap-ve-0.75
								"
							>
								{
									body.actions.map((action) => (
										<a
											className={
												(action.variant === 'outline'
													? `
														rounded-full
														border
														border-white/30
														px-ve
														py-ve-sm
														text-sm
														font-semibold
														text-white
														transition
														hover:bg-white/10
													`
													: `
														rounded-full
														bg-white
														px-ve
														py-ve-sm
														text-sm
														font-semibold
														text-ink
														transition
														hover:-translate-y-0.5
														hover:bg-frost
													`
												)
											}
											key={action.href}
											href={action.href}
											target="_blank"
											rel="noreferrer"
											tabIndex={
												(showWrapper
													? 0
													: -1
												)
											}
										>
											{action.label}
										</a>
									))
								}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
