'use client';

import {
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
	type RefObject,
} from 'react';
import {
	getCatalogProduct,
	type CatalogProductDetail,
	type CatalogProductSummary,
} from '../../lib/catalog-api';
import { CloseIcon } from '../icons/CloseIcon';
import { ProductQuickEdit } from './ProductQuickEdit';

type ProductQuickEditDialogProps = {
	product: CatalogProductSummary;
	onClose: () => void;
	onUpdated: (product: CatalogProductDetail) => void;
	/** Pencil (or other control) that opened the dialog — focused on close. */
	returnFocusRef?: RefObject<HTMLElement | null>;
};

const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
].join(', ');

function focusableIn(root: HTMLElement | null): HTMLElement[] {
	if(!root) {
		return [];
	}
	return [...root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
		(node) => {
			if(node.closest('[aria-hidden="true"]')) {
				return false;
			}
			const style = window.getComputedStyle(node);
			return style.visibility !== 'hidden' && style.display !== 'none';
		},
	);
}

export function ProductQuickEditDialog({
	product,
	onClose,
	onUpdated,
	returnFocusRef,
}: ProductQuickEditDialogProps) {
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	const returnFocusRefStable = useRef(returnFocusRef);
	const [detail, setDetail] = useState<CatalogProductDetail | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	onCloseRef.current = onClose;
	returnFocusRefStable.current = returnFocusRef;

	const requestClose = useCallback(() => {
		onCloseRef.current();
	}, []);

	useEffect(() => {
		let cancelled = false;
		setLoading(true);
		setLoadError(null);
		getCatalogProduct(product.vendor.slug, product.slug)
			.then((next) => {
				if(!cancelled) {
					setDetail(next);
				}
			})
			.catch((error) => {
				if(!cancelled) {
					setLoadError(
						error instanceof Error
							? error.message
							: 'Could not load product.',
					);
				}
			})
			.finally(() => {
				if(!cancelled) {
					setLoading(false);
				}
			});
		return () => {
			cancelled = true;
		};
	}, [product.slug, product.vendor.slug]);

	useEffect(() => {
		const prior = document.body.style.overflow;
		document.body.style.overflow = 'hidden';

		let focusAttempts = 0;
		let focusFrame = 0;
		const focusFirstControl = () => {
			const items = focusableIn(panelRef.current);
			if(items[0]) {
				items[0].focus();
				return;
			}
			panelRef.current?.focus();
			focusAttempts += 1;
			if(focusAttempts < 12) {
				focusFrame = requestAnimationFrame(focusFirstControl);
			}
		};
		focusFrame = requestAnimationFrame(focusFirstControl);

		const onKeyDown = (event: KeyboardEvent) => {
			if(event.key === 'Escape') {
				event.preventDefault();
				requestClose();
				return;
			}

			if(event.key !== 'Tab') {
				return;
			}

			const items = focusableIn(panelRef.current);
			if(items.length === 0) {
				event.preventDefault();
				panelRef.current?.focus();
				return;
			}

			// Keep Tab inside the dialog (mirror CatalogMenu).
			event.preventDefault();
			const activeIndex = items.findIndex(
				(item) => item === document.activeElement,
			);
			if(items.length === 1) {
				items[0]?.focus();
				return;
			}
			if(event.shiftKey) {
				const next = activeIndex <= 0
					? items.length - 1
					: activeIndex - 1;
				items[next]?.focus();
				return;
			}
			const next = activeIndex < 0
				? 0
				: (activeIndex + 1) % items.length;
			items[next]?.focus();
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			cancelAnimationFrame(focusFrame);
			window.removeEventListener('keydown', onKeyDown);
			document.body.style.overflow = prior;
			returnFocusRefStable.current?.current?.focus();
		};
	}, [requestClose]);

	// When the form mounts after load, pull focus in if it left the panel.
	useEffect(() => {
		if(loading || !detail) {
			return;
		}
		const active = document.activeElement;
		if(active && panelRef.current?.contains(active)) {
			return;
		}
		const items = focusableIn(panelRef.current);
		(items[0] ?? panelRef.current)?.focus();
	}, [detail, loading]);

	return (
		<div
			aria-labelledby={titleId}
			aria-modal="true"
			className="
				fixed
				inset-0
				z-[80]
				flex
				items-end
				justify-center
				sm:items-center
			"
			role="dialog"
		>
			<div
				aria-hidden="true"
				className="
					absolute
					inset-0
					bg-ink/40
				"
				onClick={requestClose}
			/>
			<div
				className="
					relative
					z-[1]
					flex
					max-h-[90vh]
					w-full
					flex-col
					overflow-hidden
					rounded-t-2xl
					border
					border-slate-200
					bg-white
					shadow-[0_16px_48px_rgba(13,27,42,0.18)]
					sm:max-w-lg
					sm:rounded-2xl
				"
				ref={panelRef}
				tabIndex={-1}
			>
				<div
					className="
						flex
						items-start
						justify-between
						gap-3
						border-b
						border-slate-200
						px-5
						py-4
					"
				>
					<div className="min-w-0">
						<p
							className="
								text-[11px]
								font-medium
								uppercase
								tracking-[0.14em]
								text-slate-500
							"
						>
							{product.vendor.name}
						</p>
						<h2
							className="
								mt-1
								truncate
								text-base
								font-semibold
								text-ink
							"
							id={titleId}
						>
							{detail?.title ?? product.title}
						</h2>
					</div>
					<button
						aria-label="Close"
						className="
							inline-flex
							h-9
							w-9
							shrink-0
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
						onClick={requestClose}
						type="button"
					>
						<CloseIcon className="h-3.5 w-3.5" />
					</button>
				</div>
				<div
					className="
						overflow-y-auto
						px-5
						py-4
					"
				>
					{loading
						? (
							<p className="text-sm text-slate-500">
								Loading…
							</p>
						)
						: loadError
							? (
								<p className="text-sm text-red-700">
									{loadError}
								</p>
							)
							: detail
								? (
									<ProductQuickEdit
										embedded
										onDone={requestClose}
										onUpdated={onUpdated}
										product={detail}
									/>
								)
								: null
					}
				</div>
			</div>
		</div>
	);
}
