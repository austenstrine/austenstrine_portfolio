'use client';

import { CaretDownIcon } from '../icons/CaretDownIcon';
import {
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';
import { useCatalogSearch } from './CatalogSearchContext';

export const CATALOG_SORTS = [
	{ id: 'relevance', label: 'Featured' },
	{ id: 'price-asc', label: 'Price: Low to High' },
	{ id: 'price-desc', label: 'Price: High to Low' },
	{ id: 'title', label: 'Name: A to Z' },
] as const;

export function CatalogSortMenu({
	onChoose,
	sort,
}: {
	onChoose: (id: string) => void;
	sort: string;
}) {
	const { extrasHost } = useCatalogSearch();
	const {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		align: 'end',
		closeKey: extrasHost,
	});
	const sortLabel = CATALOG_SORTS.find((row) => row.id === sort)?.label ?? 'Featured';
	const triggerText = `Sort: ${sortLabel}`;

	return (
		<div className="relative shrink-0">
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={triggerText}
				className="
					inline-flex
					h-10
					w-max
					max-w-[11.5rem]
					shrink-0
					items-center
					gap-1.5
					rounded-full
					border
					border-slate-300
					bg-white
					px-3
					text-sm
					font-semibold
					text-ink
					sm:max-w-[15rem]
				"
				onClick={() => setOpen((wasOpen) => !wasOpen)}
				ref={triggerRef}
				title={triggerText}
				type="button"
			>
				<span className="min-w-0 truncate">
					{triggerText}
				</span>
				<CaretDownIcon
					className="
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
						{CATALOG_SORTS.map((row) => (
							<CatalogMenuRow
								active={sort === row.id}
								key={row.id}
								onClick={() => {
									onChoose(row.id);
									setOpen(false);
								}}
							>
								<span className="truncate">
									{row.label}
								</span>
							</CatalogMenuRow>
						))}
					</CatalogMenuSurface>
				)
				: null}
		</div>
	);
}
