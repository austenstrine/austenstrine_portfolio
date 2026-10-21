'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	createCatalogProduct,
	listCatalogCategories,
	listMyVendors,
	listUoms,
	type CreateProductPayload,
	type UnitOfMeasure,
	type VendorSummary,
} from '../../../../lib/catalog-api';
import { dollarsToCents, slugify } from '../../../../lib/catalog-product-form';
import { sortCategoryTree } from '../../../../lib/category-tree';
import { useSession } from '../../../../lib/useSession';
import { CatalogWorkspaceSwitcher } from '../../../../components/catalog/CatalogWorkspaceSwitcher';
import { ProductTagField } from '../../../../components/catalog/ProductTagField';
import { TermHint } from '../../../../components/catalog/TermHint';
import { UrlSlugField } from '../../../../components/catalog/UrlSlugField';
import { RequireAccess } from '../../../../components/auth/RequireAccess';

type OfferingMode = 'SINGLE' | 'PACK' | 'PIECE' | 'BOTH';

function NewProductForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { user, loading: sessionLoading } = useSession();

	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [categories, setCategories] = useState<Array<{
		id: string;
		name: string;
		slug: string;
		parent?: { id: string; name: string; slug: string } | null;
	}>>([]);
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const categoryTree = sortCategoryTree(categories);
	const [vendorId, setVendorId] = useState(searchParams.get('vendorId') ?? '');
	const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
	const [title, setTitle] = useState('');
	const [sku, setSku] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [offeringMode, setOfferingMode] = useState<OfferingMode>('SINGLE');
	const [packUomId, setPackUomId] = useState('');
	const [pieceUomId, setPieceUomId] = useState('');
	const [singleUomId, setSingleUomId] = useState('');
	const [packPrice, setPackPrice] = useState('');
	const [piecePrice, setPiecePrice] = useState('');
	const [singlePrice, setSinglePrice] = useState('');
	const [packQty, setPackQty] = useState('0');
	const [pieceQty, setPieceQty] = useState('0');
	const [singleQty, setSingleQty] = useState('0');
	const [pieceQtyPerPack, setPieceQtyPerPack] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if(!user) {
			return;
		}

		Promise.all([listMyVendors(), listCatalogCategories()])
			.then(async ([vendorRows, categoryRows]) => {
				setVendors(vendorRows);
				setCategories(categoryRows);

				if(!vendorId && vendorRows[0]) {
					setVendorId(vendorRows[0].id);
				}
				const effectiveVendorId = vendorId || vendorRows[0]?.id;
				const uomRows = await listUoms(effectiveVendorId).catch(() => []);
				setUoms(uomRows);
				if(!categoryId && searchParams.get('categoryId')) {
					setCategoryId(searchParams.get('categoryId') ?? '');
				}

				const spool = uomRows.find((row) => row.code === 'SPOOL');
				const foot = uomRows.find((row) => row.code === 'FT');
				const each = uomRows.find((row) => row.code === 'EA');

				if(spool) {
					setPackUomId(spool.id);
				}
				if(foot) {
					setPieceUomId(foot.id);
				}
				if(each) {
					setSingleUomId(each.id);
				}
				else if(uomRows[0]) {
					setSingleUomId(uomRows[0].id);
				}
			})
			.catch(() => undefined);
	}, [user, vendorId, categoryId, searchParams]);

	const selectedVendor = useMemo(
		() => vendors.find((row) => row.id === vendorId) ?? null,
		[vendors, vendorId],
	);

	const needsPack = offeringMode === 'PACK' || offeringMode === 'BOTH';
	const needsPiece = offeringMode === 'PIECE' || offeringMode === 'BOTH';
	const needsSingle = offeringMode === 'SINGLE';

	const singleSku = sku.trim();
	const packSku =
		offeringMode === 'BOTH'
			? `${sku.trim()}-PACK`
			: sku.trim();
	const pieceSku =
		offeringMode === 'BOTH'
			? `${sku.trim()}-PIECE`
			: sku.trim();

	const buildPayload = (): CreateProductPayload => {
		const offerings: CreateProductPayload['offerings'] = [];

		if(needsSingle) {
			offerings.push({
				clientKey: 'single',
				offeringKey: 'single',
				sku: singleSku,
				uomId: singleUomId,
				role: 'STANDALONE',
				priceCents: dollarsToCents(singlePrice),
				qtyOnHand: singleQty || '0',
				tracksOwnQty: true,
			});
		}

		if(needsPack) {
			offerings.push({
				clientKey: 'pack',
				offeringKey: 'pack',
				sku: packSku,
				uomId: packUomId,
				role: 'PACK',
				priceCents: dollarsToCents(packPrice),
				qtyOnHand: packQty || '0',
				tracksOwnQty: true,
				...(offeringMode === 'BOTH'
					? {
							minUnbrokenQty: '0',
							breakPoolAboveQty: '0',
							inheritQtyToChildren: true,
						}
					: {}),
			});
		}

		if(needsPiece) {
			offerings.push({
				clientKey: 'piece',
				offeringKey: 'piece',
				sku: pieceSku,
				uomId: pieceUomId,
				role: 'PIECE',
				priceCents: dollarsToCents(piecePrice),
				qtyOnHand:
					offeringMode === 'BOTH'
						? '0'
						: pieceQty || '0',
				tracksOwnQty: offeringMode !== 'BOTH',
			});
		}

		const containments: CreateProductPayload['containments'] =
			offeringMode === 'BOTH'
				? [
						{
							parentOfferingKey: 'pack',
							childOfferingKey: 'piece',
							childQtyPerParent: pieceQtyPerPack || '1',
						},
					]
				: undefined;

		return {
			vendorId,
			categoryId: categoryId || undefined,
			slug: slug.trim(),
			title: title.trim(),
			description: description.trim() || undefined,
			tags,
			inventoryFromAllocations: offeringMode === 'BOTH',
			offerings,
			containments,
		};
	};

	const validateForSubmit = (): string | null => {
		if(!vendorId) {
			return 'Choose a vendor.';
		}
		if(!title.trim() || !slug.trim()) {
			return 'Title and product URL are required.';
		}
		if(!sku.trim()) {
			return 'SKU is required.';
		}
		if(needsSingle && !singleUomId) {
			return 'Choose a UOM for the listing.';
		}
		if(needsPack && !packUomId) {
			return 'Choose a pack UOM.';
		}
		if(needsPiece && !pieceUomId) {
			return 'Choose a piece UOM.';
		}
		if(offeringMode === 'BOTH' && (!pieceQtyPerPack || Number(pieceQtyPerPack) <= 0)) {
			return 'Enter how many piece units are in one pack.';
		}
		return null;
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		const validationError = validateForSubmit();
		if(validationError) {
			setError(validationError);
			return;
		}

		setSubmitting(true);
		try {
			const product = await createCatalogProduct(buildPayload());
			router.push(`/place-et-marque/${product.vendor.slug}/${product.slug}`);
		}
		catch(submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Could not create product.',
			);
		}
		finally {
			setSubmitting(false);
		}
	};

	if(sessionLoading || !user) {
		return (
			<p className="text-sm text-slate-500">
				Checking session…
			</p>
		);
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<CatalogWorkspaceSwitcher
				active="standard"
			/>

			<div>
				<p
					className="
						text-xs
						font-semibold
						uppercase
						tracking-[0.22em]
						text-sky
					"
				>
					Standard listing
				</p>
				<h1
					className="
						mt-2
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Create product
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Create a simple catalog listing as a single unit, pack, piece, or linked pack/piece pair.
				</p>
			</div>

			{vendors.length === 0
				? (
						<p className="text-sm text-amber-800">
							Create a vendor first.
							{' '}
							<a
								className="
									font-semibold
									text-sky
									hover:underline
								"
								href="/place-et-marque/vendors"
							>
								Go to vendors
							</a>
						</p>
					)
				: null
			}

			{uoms.length === 0
				? (
						<p className="text-sm text-amber-800">
							Add at least one unit of measure.
							{' '}
							<a
								className="
									font-semibold
									text-sky
									hover:underline
								"
								href="/place-et-marque/uoms"
							>
								Manage UOMs
							</a>
						</p>
					)
				: null
			}

			<form
				className="
					flex
					flex-col
					gap-5
					rounded-2xl
					border
					border-slate-200
					bg-white
					p-5
				"
				onSubmit={(event) => void onSubmit(event)}
			>
				<section
					className="
						flex
						flex-col
						gap-4
					"
				>
					<div className="block text-sm">
						<div
							className="
								flex
								items-center
								gap-1.5
							"
						>
							<label
								className="font-semibold"
								htmlFor="offering-mode"
							>
								Offering mode
							</label>
							<TermHint
								termId="offering"
							/>
						</div>
						<select
							className="
								mt-1
								w-full
								rounded-lg
								border
								border-slate-300
								px-3
								py-2
							"
							id="offering-mode"
							value={offeringMode}
							onChange={(event) =>
								setOfferingMode(
									event.target.value as OfferingMode,
								)
							}
						>
							<option value="SINGLE">
								Single unit
							</option>
							<option value="PACK">
								Pack only
							</option>
							<option value="PIECE">
								Piece only
							</option>
							<option value="BOTH">
								Pack + piece (linked)
							</option>
						</select>
					</div>

					<div
						className="
							grid
							gap-4
							md:grid-cols-2
						"
					>
						<label className="block text-sm">
							<span className="font-semibold">
								Vendor
							</span>
							<select
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-slate-300
									px-3
									py-2
								"
								value={vendorId}
								onChange={(event) => setVendorId(event.target.value)}
								required
							>
								<option value="">
									Select vendor
								</option>
								{vendors.map((vendor) => (
									<option
										key={vendor.id}
										value={vendor.id}
									>
										{vendor.name}
									</option>
								))}
							</select>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">
								Category
							</span>
							<select
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-slate-300
									px-3
									py-2
								"
								value={categoryId}
								onChange={(event) => setCategoryId(event.target.value)}
							>
								<option value="">
									None
								</option>
								{categoryTree.map((category) => (
									<option
										key={category.id}
										value={category.id}
									>
										{category.label}
									</option>
								))}
							</select>
						</label>
					</div>

					<label className="block text-sm">
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
							onChange={(event) => {
								setTitle(event.target.value);
								if(!slugTouched) {
									setSlug(slugify(event.target.value));
								}
							}}
							required
						/>
					</label>

					<div
						className="
							grid
							gap-4
							md:grid-cols-2
						"
					>
						<label className="block text-sm">
							<span className="font-semibold">
								{offeringMode === 'BOTH'
									? 'Base SKU'
									: 'SKU'
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
								value={sku}
								onChange={(event) => setSku(event.target.value)}
								required
							/>
							{offeringMode === 'BOTH'
								? (
										<span
											className="
												mt-1
												block
												text-xs
												text-slate-500
											"
										>
											Offerings use
											{' '}
											{packSku}
											{' '}
											and
											{' '}
											{pieceSku}.
										</span>
									)
								: null
							}
						</label>
						<UrlSlugField
							label="Product URL"
							value={slug}
							onChange={(next) => {
								setSlugTouched(true);
								setSlug(slugify(next));
							}}
							prefixPath={`/place-et-marque/${selectedVendor?.slug || 'your-store'}`}
							placeholder="product-name"
							helpText="Appears after your store address in the product page URL."
						/>
					</div>

					<label className="block text-sm">
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
							rows={3}
						/>
					</label>

					<ProductTagField
						value={tags}
						onChange={setTags}
						vendorId={vendorId || undefined}
					/>
				</section>

				{needsSingle
					? (
							<section
								className="
									rounded-xl
									border
									border-slate-100
									bg-slate-50
									p-4
								"
							>
								<h2 className="font-semibold">
									Single offering
								</h2>
								<div
									className="
										mt-3
										grid
										gap-3
										md:grid-cols-3
									"
								>
									<label className="block text-sm">
										<span className="font-semibold">
											UOM
										</span>
										<select
											className="
												mt-1
												w-full
												rounded-lg
												border
												border-slate-300
												px-3
												py-2
											"
											value={singleUomId}
											onChange={(event) => setSingleUomId(event.target.value)}
											required
										>
											<option value="">
												Select
											</option>
											{uoms.map((uom) => (
												<option
													key={uom.id}
													value={uom.id}
												>
													{uom.code} · {uom.label}
												</option>
											))}
										</select>
									</label>
									<label className="block text-sm">
										<span className="font-semibold">
											Price ($)
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
											value={singlePrice}
											onChange={(event) => setSinglePrice(event.target.value)}
											required
										/>
									</label>
									<label className="block text-sm">
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
											value={singleQty}
											onChange={(event) => setSingleQty(event.target.value)}
											required
										/>
									</label>
								</div>
							</section>
						)
					: null
				}

				{needsPack
					? (
							<section
								className="
									rounded-xl
									border
									border-slate-100
									bg-slate-50
									p-4
								"
							>
								<h2 className="font-semibold">
									Pack offering
								</h2>
								<p
									className="
										mt-1
										text-xs
										text-slate-500
									"
								>
									SKU: {packSku}
								</p>
								<div
									className="
										mt-3
										grid
										gap-3
										md:grid-cols-3
									"
								>
									<label className="block text-sm">
										<span className="font-semibold">
											UOM
										</span>
										<select
											className="
												mt-1
												w-full
												rounded-lg
												border
												border-slate-300
												px-3
												py-2
											"
											value={packUomId}
											onChange={(event) => setPackUomId(event.target.value)}
											required={needsPack}
										>
											<option value="">
												Select
											</option>
											{uoms.map((uom) => (
												<option
													key={uom.id}
													value={uom.id}
												>
													{uom.code} · {uom.label}
												</option>
											))}
										</select>
									</label>
									<label className="block text-sm">
										<span className="font-semibold">
											Price ($)
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
											value={packPrice}
											onChange={(event) => setPackPrice(event.target.value)}
											required={needsPack}
										/>
									</label>
									<label className="block text-sm">
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
											value={packQty}
											onChange={(event) => setPackQty(event.target.value)}
											required={needsPack}
										/>
									</label>
								</div>
							</section>
						)
					: null
				}

				{needsPiece
					? (
							<section
								className="
									rounded-xl
									border
									border-slate-100
									bg-slate-50
									p-4
								"
							>
								<h2 className="font-semibold">
									Piece offering
								</h2>
								<p
									className="
										mt-1
										text-xs
										text-slate-500
									"
								>
									SKU: {pieceSku}
								</p>
								<div
									className="
										mt-3
										grid
										gap-3
										md:grid-cols-3
									"
								>
									<label className="block text-sm">
										<span className="font-semibold">
											UOM
										</span>
										<select
											className="
												mt-1
												w-full
												rounded-lg
												border
												border-slate-300
												px-3
												py-2
											"
											value={pieceUomId}
											onChange={(event) => setPieceUomId(event.target.value)}
											required={needsPiece}
										>
											<option value="">
												Select
											</option>
											{uoms.map((uom) => (
												<option
													key={uom.id}
													value={uom.id}
												>
													{uom.code} · {uom.label}
												</option>
											))}
										</select>
									</label>
									<label className="block text-sm">
										<span className="font-semibold">
											Price ($)
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
											value={piecePrice}
											onChange={(event) => setPiecePrice(event.target.value)}
											required={needsPiece}
										/>
									</label>
									{offeringMode === 'BOTH'
										? (
												<label className="block text-sm">
													<span className="font-semibold">
														Piece qty per pack
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
														value={pieceQtyPerPack}
														onChange={(event) =>
															setPieceQtyPerPack(event.target.value)
														}
														required
														placeholder="500"
													/>
												</label>
											)
										: (
												<label className="block text-sm">
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
														value={pieceQty}
														onChange={(event) =>
															setPieceQty(event.target.value)
														}
														required
													/>
												</label>
											)
										}
								</div>
							</section>
						)
					: null
				}

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
						bg-ink
						px-4
						py-2.5
						text-sm
						font-semibold
						text-white
						hover:bg-sky
						disabled:opacity-60
					"
					type="submit"
					disabled={submitting || vendors.length === 0}
				>
					{submitting
						? 'Creating…'
						: 'Create product'
					}
				</button>
			</form>
		</div>
	);
}

export default function NewProductPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess
				vendorRequired
				reasonKey="products"
			>
				<NewProductForm />
			</RequireAccess>
		</Suspense>
	);
}
