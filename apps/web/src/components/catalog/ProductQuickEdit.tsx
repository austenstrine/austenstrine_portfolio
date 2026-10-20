'use client';

import { useState } from 'react';
import {
	updateCatalogProduct,
	type CatalogProductDetail,
} from '../../lib/catalog-api';
import { ProductTagField } from './ProductTagField';

type ProductQuickEditProps = {
	product: CatalogProductDetail;
	onUpdated: (product: CatalogProductDetail) => void;
};

export function ProductQuickEdit({ product, onUpdated }: ProductQuickEditProps) {
	const [title, setTitle] = useState(product.title);
	const [description, setDescription] = useState(product.description ?? '');
	const [tags, setTags] = useState<string[]>(product.tags ?? []);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onSave = async () => {
		setSaving(true);
		setError(null);

		try {
			const updated = await updateCatalogProduct(product.id, {
				title,
				description,
				tags,
				offerings: product.offerings.map((offering) => ({
					id: offering.id,
					priceCents: offering.priceCents,
					qtyOnHand: offering.qtyOnHand,
				})),
			});
			onUpdated(updated);
		}
		catch(saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Save failed.');
		}
		finally {
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
			<h2
				className="
					text-sm
					font-semibold
					uppercase
					tracking-wide
					text-amber-900
				"
			>
				Quick edit
			</h2>
			<div
				className="
					mt-4
					flex
					flex-col
					gap-3
				"
			>
				<label className="text-sm">
					<span className="font-semibold">
						Title
					</span>
					<input
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-amber-200
							px-3
							py-2
						"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
				</label>
				<label className="text-sm">
					<span className="font-semibold">
						Description
					</span>
					<textarea
						className="
							mt-1
							w-full
							rounded-lg
							border
							border-amber-200
							px-3
							py-2
						"
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						rows={4}
					/>
				</label>
				<ProductTagField
					value={tags}
					onChange={setTags}
					vendorId={product.vendor.id}
				/>
				{error
					? (
						<p className="text-sm text-red-700">
							{error}
						</p>
					)
					: null}
				<button
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
					type="button"
					onClick={onSave}
					disabled={saving}
				>
					{saving ? 'Saving…' : 'Save changes'}
				</button>
			</div>
		</section>
	);
}
