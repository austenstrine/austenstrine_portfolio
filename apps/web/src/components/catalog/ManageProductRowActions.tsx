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
import { EyeIcon } from '../icons/EyeIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { NavigatePersistentArrow } from './NavigatePersistentArrow';

const desktopShellClassName = `
	group
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
	group
	inline-flex
	min-w-0
	flex-1
	items-center
	justify-start
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
	const [deleteBusy, setDeleteBusy] = useState(false);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	async function onDelete() {
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
			{/* Desktop: equal-width View / Edit / Delete stack; caret column reserved for icon alignment. */}
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
						<EyeIcon
							className="h-3.5 w-3.5 shrink-0"
						/>
						<span>
							View
						</span>
					</span>
					<span
						aria-hidden
						className={desktopCaretSlotClassName}
					>
						<NavigatePersistentArrow
							className="text-slate-400"
						/>
					</span>
				</a>
				<a
					aria-disabled={deleteBusy || undefined}
					aria-label={`Edit ${product.title}`}
					className={`
						${desktopShellClassName}
						divide-transparent
						hover:border-sky
						hover:text-sky
						aria-disabled:pointer-events-none
						aria-disabled:opacity-60
					`}
					href={productEditHref({
						vendorSlug: product.vendor.slug,
						productSlug: product.slug,
					})}
					tabIndex={deleteBusy ? -1 : undefined}
				>
					<span
						className={desktopPrimaryClassName}
					>
						<PencilIcon
							className="h-3.5 w-3.5 shrink-0"
						/>
						<span>
							Edit
						</span>
					</span>
					<span
						aria-hidden
						className={desktopCaretSlotClassName}
					>
						<NavigatePersistentArrow
							className="text-slate-400"
						/>
					</span>
				</a>
				<button
					aria-label={`Delete ${product.title}`}
					className={`
						${desktopShellClassName}
						divide-transparent
						border-red-300
						text-red-700
						hover:border-red-500
						disabled:opacity-60
					`}
					disabled={deleteBusy}
					onClick={
						() => {
							void onDelete();
						}
					}
					type="button"
				>
					<span
						className={`
							${desktopPrimaryClassName}
							hover:bg-red-50
							hover:text-red-800
						`}
					>
						<TrashIcon
							className="h-3.5 w-3.5 shrink-0"
						/>
						<span>
							{deleteBusy
								? 'Deleting…'
								: 'Delete'
							}
						</span>
					</span>
					<span
						aria-hidden
						className={desktopCaretSlotClassName}
					/>
				</button>
			</div>
			{/* Mobile: circular View / Edit / Delete in one horizontal row. */}
			<div
				className="
					flex
					flex-row
					items-center
					justify-end
					gap-2
					sm:hidden
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
						rounded-full
						border
						border-slate-300
						bg-white
						text-ink
						hover:border-sky
						hover:text-sky
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
			</div>
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
