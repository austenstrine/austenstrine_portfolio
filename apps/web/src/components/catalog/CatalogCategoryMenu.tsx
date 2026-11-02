'use client';

import { useEffect, useMemo, useState } from 'react';
import {
	allCategoryLabel,
	nestCategoryTree,
	type NestedCategory,
} from '../../lib/category-tree';
import type { CatalogCategoryRow } from '../../lib/catalog-api';
import { ArrowLeftIcon } from '../icons/ArrowLeftIcon';
import { ArrowRightIcon } from '../icons/ArrowRightIcon';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import {
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';

export function CatalogCategoryMenu({
	categories,
	category,
	onChoose,
}: {
	categories: CatalogCategoryRow[];
	category: string;
	onChoose: (slug: string) => void;
}) {
	const [stack, setStack] = useState<NestedCategory<CatalogCategoryRow>[]>([]);
	const {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		onEscape: () => {
			if(stack.length === 0) {
				return false;
			}
			setStack((currentStack) => currentStack.slice(0, -1));
			return true;
		},
	});

	const forest = useMemo(() => nestCategoryTree(categories), [categories]);
	const selected = categories.find((row) => row.slug === category);
	const selectedLabel = selected?.name ?? (category || 'Category');
	const current = stack[stack.length - 1] ?? null;
	const rows = current ? current.children : forest;

	useEffect(() => {
		if(!open) {
			setStack([]);
		}
	}, [open]);

	const choose = (slug: string) => {
		onChoose(slug);
		setOpen(false);
		setStack([]);
	};

	return (
		<div className="relative shrink-0">
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={
					category
						? `Category: ${selectedLabel}`
						: 'Category'
				}
				className="
					flex
					h-full
					items-center
					border-r
					border-slate-200
					text-ink
				"
				onClick={() => setOpen((wasOpen) => !wasOpen)}
				ref={triggerRef}
				title={selectedLabel}
				type="button"
			>
				<span
					className="
						min-w-0
						max-w-[10ch]
						truncate
						py-2.5
						pl-3.5
						pr-1
						text-sm
						font-semibold
						sm:max-w-[14ch]
					"
				>
					{selectedLabel}
				</span>
				<CaretDownIcon
					className="
						mr-2
						h-3
						w-3
						shrink-0
						text-slate-500
					"
				/>
			</button>
			{open && panelBox
				? (
					<CatalogMenuSurface
						panelBox={panelBox}
						panelRef={panelRef}
					>
						{current
							? (
								<>
									<CatalogMenuRow
										onClick={() => setStack((currentStack) => currentStack.slice(0, -1))}
									>
										<span
											className="
												flex
												min-w-0
												items-center
												gap-2
											"
										>
											<ArrowLeftIcon className="h-3.5 w-3.5 shrink-0" />
											<span className="truncate">
												Back
											</span>
										</span>
									</CatalogMenuRow>
									<CatalogMenuRow
										active={category === current.slug}
										onClick={() => choose(current.slug)}
									>
										<span className="truncate">
											{allCategoryLabel(current.name)}
										</span>
									</CatalogMenuRow>
								</>
							)
							: (
								<CatalogMenuRow
									active={!category}
									onClick={() => choose('')}
								>
									<span className="truncate">
										All categories
									</span>
								</CatalogMenuRow>
							)
						}
						{rows.map((row) => (
							<CatalogMenuRow
								active={
									row.children.length === 0
									&& category === row.slug
								}
								key={row.id}
								onClick={() => {
									if(row.children.length > 0) {
										setStack((currentStack) => [...currentStack, row]);
										return;
									}
									choose(row.slug);
								}}
							>
								<span className="truncate">
									{row.name}
								</span>
								{row.children.length > 0
									? (
										<ArrowRightIcon
											className="
												h-3.5
												w-3.5
												shrink-0
												text-slate-400
											"
										/>
									)
									: null}
							</CatalogMenuRow>
						))}
					</CatalogMenuSurface>
				)
				: null}
		</div>
	);
}
