'use client';

import { useEffect, useState } from 'react';
import {
	updateCatalogProduct,
	type CatalogProductDetail,
} from '../../lib/catalog-api';
import { centsToDollars, dollarsToCents } from '../../lib/catalog-product-form';
import { productEditHref } from '../../lib/vendor-ref';
import { PencilIcon } from '../icons/PencilIcon';
import { ProductTagField } from './ProductTagField';

type ProductQuickEditProps = {
	product: CatalogProductDetail;
	onUpdated: (product: CatalogProductDetail) => void;
	/** Optional close control for dialog / expandable shells. */
	onDone?: () => void;
	/** Drop outer card chrome when a parent already frames the panel. */
	embedded?: boolean;
};

const fieldClassName = `
	mt-1
	w-full
	rounded-lg
	border
	border-slate-300
	px-3
	py-2
	text-sm
	text-ink
`;

export function ProductQuickEdit({
	product,
	onUpdated,
	onDone,
	embedded = false,
}: ProductQuickEditProps) {
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

	useEffect(() => {
		const nextPrimary = product.offerings[0] ?? null;
		setTitle(product.title);
		setDescription(product.description ?? '');
		setTags(product.tags ?? []);
		setPrice(nextPrimary ? centsToDollars(nextPrimary.priceCents) : '');
		setQtyOnHand(nextPrimary?.qtyOnHand ?? '0');
		setError(null);
	}, [product]);

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
			onDone?.();
		}
		catch(saveError) {
			setError(saveError instanceof Error ? saveError.message : 'Save failed.');
		}
		finally {
			setSaving(false);
		}
	};

	const body = (
		<>
			<div
				className="
					flex
					flex-wrap
					items-center
					justify-end
					gap-2
				"
			>
				<a
					className="
						inline-flex
						items-center
						gap-1.5
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
					<PencilIcon className="h-3.5 w-3.5 shrink-0" />
					Full edit
				</a>
			</div>
			<div
				className="
					mt-3
					flex
					flex-col
					gap-3
				"
			>
				<label className="text-sm text-ink">
					<span className="font-semibold">
						Title
					</span>
					<input
						className={fieldClassName}
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
				</label>
				{primaryOffering
					? (
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="text-sm text-ink">
								<span className="font-semibold">
									Price
									{primaryOffering.uom?.code
										? ` / ${primaryOffering.uom.code}`
										: ''
									}
								</span>
								<input
									className={fieldClassName}
									inputMode="decimal"
									value={price}
									onChange={(event) => setPrice(event.target.value)}
								/>
							</label>
							<label className="text-sm text-ink">
								<span className="font-semibold">
									Qty
								</span>
								<input
									className={fieldClassName}
									inputMode="decimal"
									value={qtyOnHand}
									onChange={(event) => setQtyOnHand(event.target.value)}
								/>
							</label>
						</div>
					)
					: null
				}
				<label className="text-sm text-ink">
					<span className="font-semibold">
						Description
					</span>
					<textarea
						className={fieldClassName}
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						rows={3}
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
				<div
					className="
						flex
						flex-wrap
						items-center
						gap-2
						pt-1
					"
				>
					<button
						className="
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
						onClick={() => {
							void onSave();
						}}
						disabled={saving}
					>
						{saving
							? 'Saving…'
							: 'Save'
						}
					</button>
					{onDone
						? (
							<button
								className="
									rounded-full
									border
									border-slate-300
									bg-white
									px-4
									py-2
									text-sm
									font-semibold
									text-ink
									hover:border-sky
									hover:text-sky
									disabled:opacity-60
								"
								type="button"
								onClick={onDone}
								disabled={saving}
							>
								Done
							</button>
						)
						: null
					}
				</div>
			</div>
		</>
	);

	if(embedded) {
		return (
			<div>
				{body}
			</div>
		);
	}

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
			{body}
		</section>
	);
}
