'use client';

import { useState } from 'react';
import {
	deleteCatalogProduct,
	type CatalogProductSummary,
} from '../../lib/catalog-api';
import {
	productEditHref,
	productViewHref,
} from '../../lib/vendor-ref';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import {
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';

const desktopShellClassName = `
	inline-flex
	h-9
	w-full
	overflow-hidden
	rounded-full
	border
	border-slate-300
	bg-white
	text-sm
	font-semibold
	text-ink
	divide-x
`;

const desktopPrimaryClassName = `
	inline-flex
	min-w-0
	flex-1
	items-center
	justify-between
	gap-1.5
	px-3
	hover:bg-frost
	hover:text-sky
`;

const desktopCaretSlotClassName = `
	inline-flex
	w-8
	shrink-0
	items-center
	justify-center
`;

export function ManageProductRowActions({
	onDeleted,
	product,
}: {
	onDeleted: (productId: string) => void;
	product: CatalogProductSummary;
}) {
	const {
		open,
		panelBox,
		panelRef,
		setOpen,
		triggerRef,
	} = useCatalogFloatingMenu({
		align: 'end',
		closeKey: product.id,
		minWidth: 160,
		preferredWidth: 220,
	});
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	async function onDelete() {
		setOpen(false);
		const confirmed = window.confirm(
			`Delete "${product.title}"? Live rows are removed, a CSV receipt is emailed to vendor owners, and an archive copy is kept for 6 months.`,
		);
		if(!confirmed) {
			return;
		}

		setDeleteBusy(true);
		setDeleteError(null);
		try {
			await deleteCatalogProduct(product.id);
			onDeleted(product.id);
		}
		catch(error) {
			setDeleteError(
				error instanceof Error
					? error.message
					: 'Could not delete product.',
			);
		}
		finally {
			setDeleteBusy(false);
		}
	}

	return (
		<div
			className="
				flex
				shrink-0
				flex-col
				items-end
				gap-2
			"
		>
			{/* Desktop: equal-width View / Edit stack; caret column reserved on View for icon alignment. */}
			<div
				className="
					hidden
					sm:inline-flex
					sm:flex-col
					sm:gap-2
				"
			>
				<a
					aria-label={`View ${product.title}`}
					className={`
						${desktopShellClassName}
						divide-transparent
						hover:border-sky
						hover:text-sky
					`}
					href={productViewHref({
						vendorSlug: product.vendor.slug,
						productSlug: product.slug,
					})}
				>
					<span
						className={desktopPrimaryClassName}
					>
						<span>
							View
						</span>
						<EyeIcon
							className="h-3.5 w-3.5 shrink-0"
						/>
					</span>
					<span
						aria-hidden
						className={desktopCaretSlotClassName}
					/>
				</a>
				<div
					className={`
						${desktopShellClassName}
						divide-slate-300
					`}
				>
					<a
						aria-disabled={deleteBusy || undefined}
						className={`
							${desktopPrimaryClassName}
							aria-disabled:pointer-events-none
							aria-disabled:opacity-60
						`}
						href={productEditHref({
							vendorSlug: product.vendor.slug,
							productSlug: product.slug,
						})}
						tabIndex={deleteBusy ? -1 : undefined}
					>
						<span>
							Edit
						</span>
						<PencilIcon
							className="h-3.5 w-3.5 shrink-0"
						/>
					</a>
					<button
						aria-expanded={open}
						aria-haspopup="menu"
						aria-label={`More actions for ${product.title}`}
						className={`
							${desktopCaretSlotClassName}
							hover:bg-frost
							hover:text-sky
							disabled:opacity-60
						`}
						disabled={deleteBusy}
						onClick={
							() => setOpen((wasOpen) => !wasOpen)
						}
						ref={triggerRef}
						type="button"
					>
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
				</div>
			</div>
			{/* Mobile: circular View / Edit / Delete. */}
			<a
				aria-label={`View ${product.title}`}
				className="
					inline-flex
					h-9
					w-9
					items-center
					justify-center
					rounded-full
					border
					border-slate-300
					bg-white
					text-ink
					hover:border-sky
					hover:text-sky
					sm:hidden
				"
				href={productViewHref({
					vendorSlug: product.vendor.slug,
					productSlug: product.slug,
				})}
			>
				<EyeIcon
					className="h-3.5 w-3.5 shrink-0"
				/>
			</a>
			<a
				aria-disabled={deleteBusy || undefined}
				aria-label={`Edit ${product.title}`}
				className="
					inline-flex
					h-9
					w-9
					items-center
					justify-center
					rounded-full
					border
					border-slate-300
					bg-white
					text-ink
					hover:border-sky
					hover:text-sky
					aria-disabled:pointer-events-none
					aria-disabled:opacity-60
					sm:hidden
				"
				href={productEditHref({
					vendorSlug: product.vendor.slug,
					productSlug: product.slug,
				})}
				tabIndex={deleteBusy ? -1 : undefined}
			>
				<PencilIcon
					className="h-3.5 w-3.5 shrink-0"
				/>
			</a>
			<button
				aria-label={`Delete ${product.title}`}
				className="
					inline-flex
					h-9
					w-9
					items-center
					justify-center
					rounded-full
					border
					border-red-300
					bg-white
					text-red-700
					hover:border-red-500
					disabled:opacity-60
					sm:hidden
				"
				disabled={deleteBusy}
				onClick={
					() => {
						void onDelete();
					}
				}
				type="button"
			>
				<TrashIcon
					className="h-3.5 w-3.5 shrink-0"
				/>
			</button>
			{open && panelBox
				? (
					<CatalogMenuSurface
						panelBox={panelBox}
						panelRef={panelRef}
					>
						<CatalogMenuRow
							onClick={
								() => {
									void onDelete();
								}
							}
						>
							<span
								className="
									inline-flex
									items-center
									gap-1.5
									text-red-700
								"
							>
								<TrashIcon
									className="h-3.5 w-3.5 shrink-0"
								/>
								{deleteBusy
									? 'Deleting…'
									: 'Delete'
								}
							</span>
						</CatalogMenuRow>
					</CatalogMenuSurface>
				)
				: null
			}
			{deleteError
				? (
					<p
						className="
							max-w-[12rem]
							text-right
							text-xs
							text-red-700
						"
					>
						{deleteError}
					</p>
				)
				: null
			}
		</div>
	);
}
