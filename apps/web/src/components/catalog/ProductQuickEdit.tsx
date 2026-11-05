'use client';

import { useState } from 'react';
import {
	updateCatalogProduct,
	type CatalogProductDetail,
} from '../../lib/catalog-api';
import { centsToDollars, dollarsToCents } from '../../lib/catalog-product-form';
import { productEditHref } from '../../lib/vendor-ref';
import { ProductTagField } from './ProductTagField';

type ProductQuickEditProps = {
	product: CatalogProductDetail;
	onUpdated: (product: CatalogProductDetail) => void;
};

export function ProductQuickEdit({ product, onUpdated }: ProductQuickEditProps) {
	const primaryOffering = product.offerings[0] ?? null;
	const [title, setTitle] = useState(product.title);
	const [description, setDescription] = useState(product.description ?? '');
	const [tags, setTags] = useState<string[]>(product.tags ?? []);
	const [price, setPrice] = useState(
		primaryOffering ? centsToDollars(primaryOffering.priceCents) : '',
	);
	const [qtyOnHand, setQtyOnHand] = useState(primaryOffering?.qtyOnHand ?? '0');
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
				offerings: product.offerings.map((offering, index) => ({
					id: offering.id,
					priceCents:
						index === 0 && primaryOffering
							? dollarsToCents(price)
							: offering.priceCents,
					qtyOnHand:
						index === 0 && primaryOffering
							? qtyOnHand || '0'
							: offering.qtyOnHand,
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
				border-slate-200
				bg-white
				p-5
			"
		>
			<div
				className="
					flex
					flex-wrap
					items-center
					justify-between
					gap-2
				"
			>
				<h2
					className="
						text-sm
						font-semibold
						text-ink
					"
				>
					Quick edit
				</h2>
				<a
					className="
						text-xs
						font-semibold
						text-sky
						hover:underline
					"
					href={productEditHref({
						vendorSlug: product.vendor.slug,
						productSlug: product.slug,
					})}
				>
					Full edit
				</a>
			</div>
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
							border-slate-300
							px-3
							py-2
						"
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
				</label>
				{primaryOffering
					? (
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="text-sm">
								<span className="font-semibold">
									Price
									{primaryOffering.uom?.code
										? ` / ${primaryOffering.uom.code}`
										: ''
									}
								</span>
								<input
									className="
										mt-1
										w-full
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
									"
									value={price}
									onChange={(event) => setPrice(event.target.value)}
								/>
							</label>
							<label className="text-sm">
								<span className="font-semibold">
									Qty on hand
								</span>
								<input
									className="
										mt-1
										w-full
										rounded-lg
										border
										border-slate-300
										px-3
										py-2
									"
									value={qtyOnHand}
									onChange={(event) => setQtyOnHand(event.target.value)}
								/>
							</label>
						</div>
					)
					: null
				}
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
							border-slate-300
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
					: null
				}
				<button
					className="
						self-start
						rounded-full
						bg-sky
						px-4
						py-2
						text-sm
						font-semibold
						text-white
						hover:bg-sky/90
						disabled:opacity-60
					"
					type="button"
					onClick={onSave}
					disabled={saving}
				>
					{saving
						? 'Saving…'
						: 'Save changes'
					}
				</button>
			</div>
		</section>
	);
}
