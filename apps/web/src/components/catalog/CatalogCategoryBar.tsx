'use client';

import {
	useEffect,
	useRef,
	useState,
	useMemo,
	type CSSProperties,
	type ReactNode,
} from 'react';
import {
	allCategoryLabel,
	nestCategoryTree,
	type NestedCategory,
} from '../../lib/category-tree';
import type { CatalogCategoryRow } from '../../lib/catalog-api';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';

const CHIP_STAGGER_MS = 36;

function prefersReducedMotion() {
	return (
		typeof window !== 'undefined'
		&& window.matchMedia('(prefers-reduced-motion: reduce)').matches
	);
}

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
	typewriter = false,
	typewriterDelayMs = 0,
}: {
	active?: boolean;
	ariaLabel?: string;
	children: ReactNode;
	onClick: () => void;
	typewriter?: boolean;
	typewriterDelayMs?: number;
}) {
	const style: CSSProperties | undefined = typewriter
		? {
			animationDelay: `${typewriterDelayMs}ms`,
		}
		: undefined;

	return (
		<button
			aria-current={active ? true : undefined}
			aria-label={ariaLabel}
			className={
				active
					? typewriter
						? `
							catalog-subcat-chip
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
							bg-asgreen/15
							px-3
							leading-none
							text-asgreen
						`
					: typewriter
						? `
							catalog-subcat-chip
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
			style={style}
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

function rowClassName(drilled: boolean, animate: boolean) {
	if(drilled) {
		if(animate) {
			return `
				catalog-subcat-row-enter
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
			`;
		}
		return `
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
		`;
	}
	if(animate) {
		return `
			catalog-subcat-row-enter
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
		`;
	}
	return `
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
	`;
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
	const [reduceMotion, setReduceMotion] = useState(false);
	const prevLevelKeyRef = useRef<string | null>(null);
	const forest = useMemo(() => nestCategoryTree(categories), [categories]);
	const current = stack[stack.length - 1] ?? null;
	const rows = current ? current.children : forest;
	const levelKey = current?.id ?? 'root';
	const drilled = current !== null;
	// Animate on the same render the row key changes (after first paint).
	const isLevelChange =
		prevLevelKeyRef.current !== null
		&& prevLevelKeyRef.current !== levelKey;
	prevLevelKeyRef.current = levelKey;
	const chipMotion = isLevelChange && !reduceMotion;

	useEffect(() => {
		setReduceMotion(prefersReducedMotion());
	}, []);

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

	const goBack = () => {
		setStack((currentStack) => currentStack.slice(0, -1));
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
					relative
					mx-auto
					min-w-0
					max-w-7xl
					overflow-hidden
				"
			>
				<div
					className={rowClassName(drilled, chipMotion)}
					key={levelKey}
				>
					{current
						? (
							<>
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
										active={category === current.slug}
										onClick={() => onChoose(current.slug)}
										typewriter={chipMotion}
										typewriterDelayMs={0}
									>
										{allCategoryLabel(current.name)}
									</CategoryChip>
									{rows.map((row, index) => (
										<CategoryChip
											active={
												row.children.length === 0
												&& category === row.slug
											}
											key={row.id}
											onClick={() => chooseOrDrill(row)}
											typewriter={chipMotion}
											typewriterDelayMs={(index + 1) * CHIP_STAGGER_MS}
										>
											{row.name}
										</CategoryChip>
									))}
								</div>
							</>
						)
						: rows.map((row, index) => (
							<CategoryChip
								active={
									row.children.length === 0
									&& category === row.slug
								}
								key={row.id}
								onClick={() => chooseOrDrill(row)}
								typewriter={chipMotion}
								typewriterDelayMs={index * CHIP_STAGGER_MS}
							>
								{row.name}
							</CategoryChip>
						))
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
