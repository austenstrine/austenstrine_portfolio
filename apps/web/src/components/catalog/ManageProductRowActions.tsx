'use client';

import { useState } from 'react';
import {
	deleteCatalogProduct,
	type CatalogProductSummary,
} from '../../lib/catalog-api';
import { CaretDownIcon } from '../icons/CaretDownIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import {
	CatalogMenuRow,
	CatalogMenuSurface,
	useCatalogFloatingMenu,
} from './CatalogMenu';

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
			<a
				aria-label={`View ${product.title}`}
				className="
					inline-flex
					h-9
					w-9
					items-center
					justify-center
					gap-1.5
					rounded-full
					border
					border-slate-300
					bg-white
					text-sm
					font-semibold
					text-ink
					hover:border-sky
					hover:text-sky
					sm:w-auto
					sm:justify-start
					sm:px-3
				"
				href={`/place-et-marque/${product.vendor.slug}/${product.slug}`}
			>
				<span
					className="
						hidden
						sm:inline
					"
				>
					View
				</span>
				<EyeIcon
					className="h-3.5 w-3.5 shrink-0"
				/>
			</a>
			{/* Desktop: Edit split [label+pencil | caret→Delete]. Mobile: circular Edit + Delete. */}
			<div
				className="
					hidden
					overflow-hidden
					rounded-full
					border
					border-slate-300
					bg-white
					text-sm
					font-semibold
					text-ink
					divide-x
					divide-slate-300
					sm:inline-flex
					sm:h-9
					sm:items-center
				"
			>
				<a
					aria-disabled={deleteBusy || undefined}
					className="
						inline-flex
						h-full
						items-center
						gap-1.5
						px-3
						hover:bg-frost
						hover:text-sky
						aria-disabled:pointer-events-none
						aria-disabled:opacity-60
					"
					href={`/place-et-marque/products/${product.id}/edit`}
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
					className="
						inline-flex
						h-full
						items-center
						justify-center
						px-2
						hover:bg-frost
						hover:text-sky
						disabled:opacity-60
					"
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
				href={`/place-et-marque/products/${product.id}/edit`}
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
