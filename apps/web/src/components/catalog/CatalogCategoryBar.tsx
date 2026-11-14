'use client';

import {
	useEffect,
	useState,
	useMemo,
	type ReactNode,
	type TransitionEvent,
} from 'react';
import {
	allCategoryLabel,
	nestCategoryTree,
	type NestedCategory,
} from '../../lib/category-tree';
import type { CatalogCategoryRow } from '../../lib/catalog-api';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';

function DepartmentScrollFade({
	side,
}: {
	side: 'left' | 'right';
}) {
	const isLeft = side === 'left';

	return (
		<div
			aria-hidden
			className={
				isLeft
					? `
						pointer-events-none
						absolute
						inset-y-0
						left-0
						z-10
						w-[calc(var(--gutter)+1.5rem)]
						bg-gradient-to-r
						from-white
						to-white/0
					`
					: `
						pointer-events-none
						absolute
						inset-y-0
						right-0
						z-10
						w-[calc(var(--gutter)+1.5rem)]
						bg-gradient-to-l
						from-white
						to-white/0
					`
			}
		/>
	);
}

function CategoryChip({
	active = false,
	ariaLabel,
	children,
	onClick,
}: {
	active?: boolean;
	ariaLabel?: string;
	children: ReactNode;
	onClick: () => void;
}) {
	return (
		<button
			aria-current={active ? true : undefined}
			aria-label={ariaLabel}
			className={
				active
					? `
						inline-flex
						h-8
						shrink-0
						items-center
						whitespace-nowrap
						rounded-full
						bg-asgreen/15
						px-3
						leading-none
						text-asgreen
					`
					: `
						inline-flex
						h-8
						shrink-0
						items-center
						whitespace-nowrap
						rounded-full
						px-3
						leading-none
						text-slate-600
						hover:bg-frost
						hover:text-ink
					`
			}
			onClick={onClick}
			type="button"
		>
			{children}
		</button>
	);
}

function ChipScroller({
	children,
	withBack = false,
}: {
	children: ReactNode;
	withBack?: boolean;
}) {
	return (
		<div
			className="
				relative
				min-w-0
			"
		>
			<div
				className={
					withBack
						? `
							flex
							h-12
							flex-nowrap
							items-center
							min-w-0
							overflow-x-auto
							overscroll-x-contain
							whitespace-nowrap
							pr-[calc(var(--gutter)+1.5rem)]
							text-[13px]
							font-semibold
							[scrollbar-width:none]
							[&::-webkit-scrollbar]:hidden
						`
						: `
							flex
							h-12
							flex-nowrap
							items-center
							min-w-0
							gap-1
							overflow-x-auto
							overscroll-x-contain
							whitespace-nowrap
							px-[calc(var(--gutter)+1.5rem)]
							text-[13px]
							font-semibold
							[scrollbar-width:none]
							[&::-webkit-scrollbar]:hidden
						`
				}
			>
				{children}
			</div>
			{withBack
				? null
				: (
					<DepartmentScrollFade side="left" />
				)
			}
			<DepartmentScrollFade side="right" />
		</div>
	);
}

function PinnedBack({
	onBack,
}: {
	onBack: () => void;
}) {
	return (
		<div
			className="
				sticky
				left-0
				z-20
				flex
				h-12
				shrink-0
				items-center
				pl-gutter
			"
		>
			<div
				aria-hidden
				className="
					absolute
					inset-y-0
					left-0
					right-[calc(var(--gutter)+1.5rem)]
					bg-white
				"
			/>
			<div className="relative z-10">
				<CategoryChip
					ariaLabel="Back"
					onClick={onBack}
				>
					<span
						className="
							inline-flex
							items-center
							gap-1.5
						"
					>
						<ArrowLeftIcon
							className="
								h-3.5
								w-3.5
								shrink-0
							"
						/>
						<span>
							Back
						</span>
					</span>
				</CategoryChip>
			</div>
			<span
				aria-hidden
				className="
					w-[calc(var(--gutter)+1.5rem)]
					shrink-0
				"
			/>
			<div
				aria-hidden
				className="
					pointer-events-none
					absolute
					inset-y-0
					right-0
					z-10
					w-[calc(var(--gutter)+1.5rem)]
					bg-gradient-to-r
					from-white
					to-white/0
				"
			/>
		</div>
	);
}

export function CatalogCategoryBar({
	categories,
	category,
	onChoose,
}: {
	categories: CatalogCategoryRow[];
	category: string;
	onChoose: (slug: string) => void;
}) {
	const [stack, setStack] = useState<NestedCategory<CatalogCategoryRow>[]>([]);
	const [held, setHeld] = useState<NestedCategory<CatalogCategoryRow> | null>(null);
	const forest = useMemo(() => nestCategoryTree(categories), [categories]);
	const current = stack[stack.length - 1] ?? null;
	const root = stack[0] ?? null;
	const panel = current ?? held;
	const rows = panel ? panel.children : [];
	const drilled = current !== null;

	useEffect(() => {
		if(current) {
			setHeld(current);
			return;
		}
		if(
			typeof window !== 'undefined'
			&& window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			setHeld(null);
		}
	}, [current]);

	if(forest.length === 0) {
		return null;
	}

	const chooseOrDrill = (row: NestedCategory<CatalogCategoryRow>) => {
		if(row.children.length > 0) {
			setStack([row]);
			return;
		}
		setStack([]);
		onChoose(row.slug);
	};

	const drillChild = (row: NestedCategory<CatalogCategoryRow>) => {
		if(row.children.length > 0) {
			setStack((currentStack) => [...currentStack, row]);
			return;
		}
		onChoose(row.slug);
	};

	const goBack = () => {
		setStack((currentStack) => currentStack.slice(0, -1));
	};

	const onRevealTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
		if(event.propertyName !== 'grid-template-rows') {
			return;
		}
		if(!drilled) {
			setHeld(null);
		}
	};

	return (
		<nav
			aria-label="Shop by category"
			className="
				hidden
				border-t
				border-slate-100
				bg-white
				md:block
			"
		>
			<div
				className="
					mx-auto
					min-w-0
					max-w-7xl
				"
			>
				<ChipScroller>
					{forest.map((row) => (
						<CategoryChip
							active={
								row.children.length === 0
									? category === row.slug
									: root?.id === row.id
							}
							key={row.id}
							onClick={() => chooseOrDrill(row)}
						>
							{row.name}
						</CategoryChip>
					))}
				</ChipScroller>
				<div
					aria-hidden={!drilled}
					className={
						drilled
							? `
								grid
								grid-rows-[1fr]
								opacity-100
								transition-[grid-template-rows,opacity]
								duration-300
								ease-out
								motion-reduce:transition-none
							`
							: `
								grid
								grid-rows-[0fr]
								opacity-0
								transition-[grid-template-rows,opacity]
								duration-300
								ease-out
								motion-reduce:transition-none
							`
					}
					onTransitionEnd={onRevealTransitionEnd}
					ref={(el) => {
						if(el) {
							el.inert = !drilled;
						}
					}}
				>
					<div className="overflow-hidden">
						<div
							className={
								drilled
									? `
										border-t
										border-slate-100
										translate-y-0
										transition-transform
										duration-300
										ease-out
										motion-reduce:transition-none
									`
									: `
										border-t
										border-slate-100
										-translate-y-1
										transition-transform
										duration-300
										ease-out
										motion-reduce:transition-none
									`
							}
						>
							{panel
								? (
									<ChipScroller withBack>
										<PinnedBack onBack={goBack} />
										<div
											className="
												flex
												h-8
												flex-nowrap
												items-center
												gap-1
											"
										>
											<CategoryChip
												active={category === panel.slug}
												onClick={() => onChoose(panel.slug)}
											>
												{allCategoryLabel(panel.name)}
											</CategoryChip>
											{rows.map((row) => (
												<CategoryChip
													active={
														row.children.length === 0
														&& category === row.slug
													}
													key={row.id}
													onClick={() => drillChild(row)}
												>
													{row.name}
												</CategoryChip>
											))}
										</div>
									</ChipScroller>
								)
								: null
							}
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}
