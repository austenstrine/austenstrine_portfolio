'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
};

export function ProductQuickEditDialog({
	product,
	onClose,
	onUpdated,
}: ProductQuickEditDialogProps) {
	const titleId = useId();
	const panelRef = useRef<HTMLDivElement>(null);
	const [detail, setDetail] = useState<CatalogProductDetail | null>(null);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

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
		const onKey = (event: KeyboardEvent) => {
			if(event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [onClose]);

	useEffect(() => {
		const prior = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		panelRef.current?.focus();
		return () => {
			document.body.style.overflow = prior;
		};
	}, []);

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
			<button
				aria-label="Close"
				className="
					absolute
					inset-0
					bg-ink/40
				"
				onClick={onClose}
				type="button"
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
						onClick={onClose}
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
										onDone={onClose}
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
