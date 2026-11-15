'use client';

import { CaretDownIcon } from '../icons/CaretDownIcon';
import {
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';

/** Shared frost pill for manage / seller filter triggers (matches search inputs). */
export const frostSelectTriggerClassName = `
	inline-flex
	items-center
	justify-between
	gap-1.5
	rounded-full
	border
	border-slate-300
	bg-white
	px-2.5
	py-1.5
	text-left
	text-sm
	font-semibold
	text-ink
`;

export type FrostSelectOption<T extends string = string> = {
	id: T;
	label: string;
};

/**
 * Frost rounded-full select: CatalogMenu surface + caret that flips while open.
 * Replaces native select where open-state caret and text alignment matter.
 */
export function FrostSelectMenu<T extends string>({
	align = 'start',
	ariaLabel,
	className = '',
	fullWidth = false,
	minWidth = 160,
	onChange,
	options,
	preferredWidth = 240,
	value,
}: {
	align?: 'start' | 'end';
	ariaLabel: string;
	className?: string;
	/** Stretch trigger to the parent width (vendor top-bar slot). */
	fullWidth?: boolean;
	minWidth?: number;
	onChange: (value: T) => void;
	options: ReadonlyArray<FrostSelectOption<T>>;
	preferredWidth?: number;
	value: T;
}) {
	const {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		align,
		minWidth,
		preferredWidth,
	});
	const selectedLabel = options.find((row) => row.id === value)?.label ?? '';

	let rootClassName = `
		relative
		inline-flex
		min-w-0
		max-w-full
	`;
	if(fullWidth) {
		rootClassName = `
			relative
			w-full
			min-w-0
		`;
	}

	let triggerClassName = `
		${frostSelectTriggerClassName}
		w-max
		max-w-full
	`;
	if(fullWidth) {
		triggerClassName = `
			${frostSelectTriggerClassName}
			w-full
		`;
	}
	if(className) {
		triggerClassName = `
			${triggerClassName}
			${className}
		`;
	}

	return (
		<div className={rootClassName}>
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-label={ariaLabel}
				className={triggerClassName}
				onClick={() => setOpen((wasOpen) => !wasOpen)}
				ref={triggerRef}
				type="button"
			>
				<span
					className="
						min-w-0
						flex-1
						truncate
					"
				>
					{selectedLabel}
				</span>
				<CaretDownIcon
					className={
						open
							? `
								h-3
								w-3
								shrink-0
								rotate-180
								text-slate-500
								transition
							`
							: `
								h-3
								w-3
								shrink-0
								text-slate-500
								transition
							`
					}
				/>
			</button>
			{open && panelBox
				? (
					<CatalogMenuSurface
						panelBox={panelBox}
						panelRef={panelRef}
					>
						{options.map((row) => (
							<CatalogMenuRow
								active={value === row.id}
								key={row.id || '__empty__'}
								onClick={() => {
									onChange(row.id);
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
