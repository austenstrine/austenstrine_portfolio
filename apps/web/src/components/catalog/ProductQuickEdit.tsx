'use client';

import { useState } from 'react';
import {
	updateCatalogProduct,
	type CatalogProductDetail,
} from '../../lib/catalog-api';

type ProductQuickEditProps = {
	product: CatalogProductDetail;
	onUpdated: (product: CatalogProductDetail) => void;
};

export function ProductQuickEdit({ product, onUpdated }: ProductQuickEditProps) {
	const [title, setTitle] = useState(product.title);
	const [description, setDescription] = useState(product.description ?? '');
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onSave = async () => {
		setSaving(true);
		setError(null);

		try {
			const updated = await updateCatalogProduct(product.id, {
				title,
				description,
				offerings: product.offerings.map((offering) => ({
					id: offering.id,
					priceCents: offering.priceCents,
					qtyOnHand: offering.qtyOnHand,
				})),
			});
			onUpdated(updated);
		} catch (saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Save failed.');
		} finally {
			setSaving(false);
		}
	};

	return (
		<section
			className="
				rounded-2xl
				border
				border-amber-200
				bg-amber-50
				p-5
			"
		>
			<h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900">
				Quick edit
			</h2>
			<div className="mt-4 flex flex-col gap-3">
				<label className="text-sm">
					<span className="font-semibold">Title</span>
					<input
						value={title}
						onChange={(event) => setTitle(event.target.value)}
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-amber-200
							px-3
							py-2
						"
					/>
				</label>
				<label className="text-sm">
					<span className="font-semibold">Description</span>
					<textarea
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						rows={4}
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-amber-200
							px-3
							py-2
						"
					/>
				</label>
				{error ? <p className="text-sm text-red-700">{error}</p> : null}
				<button
					type="button"
					onClick={onSave}
					disabled={saving}
					className="
						self-start
						rounded-full
						bg-ink
						px-4
						py-2
						text-sm
						font-semibold
						text-white
						hover:bg-sky
						disabled:opacity-60
					"
				>
					{saving ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</section>
	);
}
