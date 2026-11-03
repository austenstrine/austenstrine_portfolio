'use client';

import { useMemo, useState, type ReactNode } from 'react';
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
	const forest = useMemo(() => nestCategoryTree(categories), [categories]);
	const current = stack[stack.length - 1] ?? null;
	const rows = current ? current.children : forest;

	if(forest.length === 0) {
		return null;
	}

	const chooseOrDrill = (row: NestedCategory<CatalogCategoryRow>) => {
		if(row.children.length > 0) {
			setStack((currentStack) => [...currentStack, row]);
			return;
		}
		onChoose(row.slug);
	};

	const chips = (
		<>
			{current
				? (
					<CategoryChip
						active={category === current.slug}
						onClick={() => onChoose(current.slug)}
					>
						{allCategoryLabel(current.name)}
					</CategoryChip>
				)
				: null
			}
			{rows.map((row) => (
				<CategoryChip
					active={
						row.children.length === 0
						&& category === row.slug
					}
					key={row.id}
					onClick={() => chooseOrDrill(row)}
				>
					{row.name}
				</CategoryChip>
			))}
		</>
	);

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
					relative
					mx-auto
					min-w-0
					max-w-7xl
				"
			>
				<div
					className={
						current
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
					{current
						? (
							<>
								<PinnedBack
									onBack={() => setStack((currentStack) => currentStack.slice(0, -1))}
								/>
								<div
									className="
										flex
										h-8
										flex-nowrap
										items-center
										gap-1
									"
								>
									{chips}
								</div>
							</>
						)
						: chips
					}
				</div>
				{current
					? null
					: (
						<DepartmentScrollFade side="left" />
					)
				}
				<DepartmentScrollFade side="right" />
			</div>
		</nav>
	);
}
