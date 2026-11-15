'use client';

import { useEffect, useRef, useState } from 'react';
import {
	deleteCatalogProduct,
	restoreArchivedCatalogProduct,
	type CatalogProductSummary,
} from '../../lib/catalog-api';
import {
	productEditHref,
	productViewHref,
} from '../../lib/vendor-ref';
import { EyeIcon } from '../icons/EyeIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { DestructiveConfirmActions } from '../ui/DestructiveConfirmActions';
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

const UNDO_WINDOW_MS = 30_000;

export function ManageProductRowActions({
	onDeleted,
	onRestored,
	product,
}: {
	onDeleted: (productId: string) => void;
	/**
	 * Called after a successful undo-archive with the live product id
	 * (same as `product.id` when restore reuses `originalId`).
	 */
	onRestored?: (product: CatalogProductSummary) => void;
	product: CatalogProductSummary;
}) {
	const [confirmMode, setConfirmMode] = useState<'archive' | 'permanent' | null>(null);
	const [busyMode, setBusyMode] = useState<'archive' | 'permanent' | 'undo' | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [archivedProductId, setArchivedProductId] = useState<string | null>(null);
	const [undoSecondsLeft, setUndoSecondsLeft] = useState(0);
	const undoTimerRef = useRef<number | null>(null);
	const undoTickRef = useRef<number | null>(null);
	const pendingRemoveRef = useRef(false);

	useEffect(() => {
		return () => {
			if(undoTimerRef.current !== null) {
				window.clearTimeout(undoTimerRef.current);
			}
			if(undoTickRef.current !== null) {
				window.clearInterval(undoTickRef.current);
			}
			if(pendingRemoveRef.current) {
				onDeleted(product.id);
			}
		};
	}, [onDeleted, product.id]);

	function clearUndoTimers() {
		if(undoTimerRef.current !== null) {
			window.clearTimeout(undoTimerRef.current);
			undoTimerRef.current = null;
		}
		if(undoTickRef.current !== null) {
			window.clearInterval(undoTickRef.current);
			undoTickRef.current = null;
		}
	}

	function beginUndoWindow(archiveId: string) {
		clearUndoTimers();
		setArchivedProductId(archiveId);
		setUndoSecondsLeft(Math.ceil(UNDO_WINDOW_MS / 1000));
		pendingRemoveRef.current = true;
		const startedAt = Date.now();
		undoTickRef.current = window.setInterval(() => {
			const left = Math.max(
				0,
				Math.ceil((UNDO_WINDOW_MS - (Date.now() - startedAt)) / 1000),
			);
			setUndoSecondsLeft(left);
		}, 250);
		undoTimerRef.current = window.setTimeout(() => {
			clearUndoTimers();
			pendingRemoveRef.current = false;
			setArchivedProductId(null);
			onDeleted(product.id);
		}, UNDO_WINDOW_MS);
	}

	async function runArchive() {
		setBusyMode('archive');
		setError(null);
		try {
			const result = await deleteCatalogProduct(product.id);
			const archiveId = result.archivedProductIds[0] ?? null;
			setConfirmMode(null);
			if(archiveId) {
				beginUndoWindow(archiveId);
			}
			else {
				onDeleted(product.id);
			}
		}
		catch(err) {
			setError(
				err instanceof Error
					? err.message
					: 'Could not archive product.',
			);
		}
		finally {
			setBusyMode(null);
		}
	}

	async function runPermanentDelete() {
		setBusyMode('permanent');
		setError(null);
		try {
			await deleteCatalogProduct(product.id, { permanent: true });
			setConfirmMode(null);
			onDeleted(product.id);
		}
		catch(err) {
			setError(
				err instanceof Error
					? err.message
					: 'Could not delete product.',
			);
		}
		finally {
			setBusyMode(null);
		}
	}

	async function runUndoArchive() {
		if(!archivedProductId) {
			return;
		}
		setBusyMode('undo');
		setError(null);
		try {
			const restored = await restoreArchivedCatalogProduct(archivedProductId);
			clearUndoTimers();
			pendingRemoveRef.current = false;
			setArchivedProductId(null);
			setUndoSecondsLeft(0);
			onRestored?.({
				...product,
				id: restored.productId,
				slug: restored.slug,
				title: restored.title,
			});
		}
		catch(err) {
			setError(
				err instanceof Error
					? err.message
					: 'Could not undo archive.',
			);
		}
		finally {
			setBusyMode(null);
		}
	}

	if(archivedProductId) {
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
				<p
					className="
						max-w-[14rem]
						text-right
						text-sm
						font-semibold
						text-slate-800
					"
				>
					Archived. Undo for {undoSecondsLeft}s.
				</p>
				<button
					className="
						rounded-full
						border
						border-asgreen
						bg-white
						px-4
						py-2
						text-sm
						font-semibold
						text-asgreen
						hover:bg-asgreen/10
						disabled:opacity-60
					"
					disabled={busyMode === 'undo'}
					onClick={
						() => {
							void runUndoArchive();
						}
					}
					type="button"
				>
					{busyMode === 'undo'
						? 'Restoring…'
						: 'Undo archive'
					}
				</button>
				{error
					? (
						<p
							className="
								max-w-[12rem]
								text-right
								text-xs
								text-red-700
							"
						>
							{error}
						</p>
					)
					: null
				}
			</div>
		);
	}

	if(confirmMode === 'permanent') {
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
				<DestructiveConfirmActions
					prompt={`Permanently delete "${product.title}"?`}
					detail="No archive copy will be kept."
					irreversible
					confirmLabel="Delete permanently"
					busy={busyMode === 'permanent'}
					busyLabel="Deleting…"
					onConfirm={
						() => {
							void runPermanentDelete();
						}
					}
					onDismiss={
						() => {
							if(!busyMode) {
								setConfirmMode('archive');
								setError(null);
							}
						}
					}
				/>
				{error
					? (
						<p
							className="
								max-w-[12rem]
								text-right
								text-xs
								text-red-700
							"
						>
							{error}
						</p>
					)
					: null
				}
			</div>
		);
	}

	if(confirmMode === 'archive') {
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
				<DestructiveConfirmActions
					prompt={`Archive "${product.title}"?`}
					detail="Live listing is removed. An archive copy is kept for 6 months and can be restored. Owners get a CSV receipt."
					confirmLabel="Archive"
					busy={busyMode === 'archive'}
					busyLabel="Archiving…"
					onConfirm={
						() => {
							void runArchive();
						}
					}
					onDismiss={
						() => {
							if(!busyMode) {
								setConfirmMode(null);
								setError(null);
							}
						}
					}
					secondaryConfirmLabel="Delete permanently…"
					onSecondaryConfirm={
						() => {
							if(!busyMode) {
								setConfirmMode('permanent');
								setError(null);
							}
						}
					}
				/>
				{error
					? (
						<p
							className="
								max-w-[12rem]
								text-right
								text-xs
								text-red-700
							"
						>
							{error}
						</p>
					)
					: null
				}
			</div>
		);
	}

	const busy = busyMode !== null;

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
			{/* Desktop: equal-width View / Edit / Archive stack; caret column reserved for icon alignment. */}
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
					aria-disabled={busy || undefined}
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
					tabIndex={busy ? -1 : undefined}
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
					aria-label={`Archive ${product.title}`}
					className={`
						${desktopShellClassName}
						divide-transparent
						border-red-300
						text-red-700
						hover:border-red-500
						disabled:opacity-60
					`}
					disabled={busy}
					onClick={
						() => {
							setConfirmMode('archive');
							setError(null);
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
							Archive
						</span>
					</span>
					<span
						aria-hidden
						className={desktopCaretSlotClassName}
					/>
				</button>
			</div>
			{/* Mobile: circular View / Edit / Archive in one horizontal row. */}
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
					aria-disabled={busy || undefined}
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
					tabIndex={busy ? -1 : undefined}
				>
					<PencilIcon
						className="h-3.5 w-3.5 shrink-0"
					/>
				</a>
				<button
					aria-label={`Archive ${product.title}`}
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
					disabled={busy}
					onClick={
						() => {
							setConfirmMode('archive');
							setError(null);
						}
					}
					type="button"
				>
					<TrashIcon
						className="h-3.5 w-3.5 shrink-0"
					/>
				</button>
			</div>
			{error
				? (
					<p
						className="
							max-w-[12rem]
							text-right
							text-xs
							text-red-700
						"
					>
						{error}
					</p>
				)
				: null
			}
		</div>
	);
}
