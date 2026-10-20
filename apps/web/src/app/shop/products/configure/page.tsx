'use client';

import { useRouter } from 'next/navigation';
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
import { useSession } from '../../../../lib/useSession';
import { CatalogWorkspaceSwitcher } from '../../../../components/catalog/CatalogWorkspaceSwitcher';
import { ProductTagField } from '../../../../components/catalog/ProductTagField';
import { UrlSlugField } from '../../../../components/catalog/UrlSlugField';
import { RequireAccess } from '../../../../components/auth/RequireAccess';

type BreakFeeMode = 'OFF' | 'PER_PARENT_OPENED' | 'ONCE_PER_LINE' | 'PRODUCT_ONCE';

type ChainLevel = {
	key: string;
	label: string;
	sku: string;
	uomId: string;
	price: string;
	qtyOnHand: string;
	childQtyPerParent: string;
	autoBreakEnabled: boolean;
	minUnbrokenQty: string;
	breakPoolAboveQty: string;
	inheritQtyToChildren: boolean;
	linkBreakFeeCents: string;
};

function createLevel(partial?: Partial<ChainLevel>): ChainLevel {
	return {
		key: partial?.key ?? `level-${Math.random().toString(36).slice(2, 8)}`,
		label: partial?.label ?? 'Offering',
		sku: partial?.sku ?? '',
		uomId: partial?.uomId ?? '',
		price: partial?.price ?? '',
		qtyOnHand: partial?.qtyOnHand ?? '0',
		childQtyPerParent: partial?.childQtyPerParent ?? '1',
		autoBreakEnabled: partial?.autoBreakEnabled ?? false,
		minUnbrokenQty: partial?.minUnbrokenQty ?? '0',
		breakPoolAboveQty: partial?.breakPoolAboveQty ?? '0',
		inheritQtyToChildren: partial?.inheritQtyToChildren ?? false,
		linkBreakFeeCents: partial?.linkBreakFeeCents ?? '',
	};
}

function InventoryConfigurationForm() {
	const router = useRouter();
	const { user, loading: sessionLoading } = useSession();

	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [vendorId, setVendorId] = useState('');
	const [categoryId, setCategoryId] = useState('');
	const [title, setTitle] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [description, setDescription] = useState('');
	const [tags, setTags] = useState<string[]>([]);
	const [breakFeeMode, setBreakFeeMode] = useState<BreakFeeMode>('OFF');
	const [breakFeeDollars, setBreakFeeDollars] = useState('0');
	const [levels, setLevels] = useState<ChainLevel[]>([
		createLevel({ label: 'Sellable unit', autoBreakEnabled: false }),
	]);
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
				const selected = vendorRows[0]?.id ?? '';
				if(selected) {
					setVendorId(selected);
				}
				const uomRows = await listUoms(selected || undefined).catch(() => []);
				setUoms(uomRows);

				const spool = uomRows.find((row) => row.code === 'SPOOL');
				const foot = uomRows.find((row) => row.code === 'FT');
				const pallet = uomRows.find((row) => row.code === 'PK' || row.code === 'BX');

				if(spool || foot) {
					setLevels([
						createLevel({
							key: 'pallet',
							label: 'Larger pack (optional)',
							sku: '',
							uomId: pallet?.id ?? '',
							price: '',
							qtyOnHand: '0',
							childQtyPerParent: '48',
							autoBreakEnabled: false,
							minUnbrokenQty: '0',
							breakPoolAboveQty: '0',
							inheritQtyToChildren: false,
						}),
						createLevel({
							key: 'spool',
							label: 'Pack / spool',
							sku: '',
							uomId: spool?.id ?? '',
							price: '',
							qtyOnHand: '0',
							childQtyPerParent: '500',
							autoBreakEnabled: true,
							minUnbrokenQty: '0',
							breakPoolAboveQty: '0',
							inheritQtyToChildren: true,
						}),
						createLevel({
							key: 'foot',
							label: 'Inner unit',
							sku: '',
							uomId: foot?.id ?? '',
							price: '',
							qtyOnHand: '0',
							childQtyPerParent: '1',
							autoBreakEnabled: false,
						}),
					]);
				}
			})
			.catch(() => undefined);
	}, [user]);

	const selectedVendor = useMemo(
		() => vendors.find((row) => row.id === vendorId) ?? null,
		[vendors, vendorId],
	);

	const activeLevels = useMemo(
		() => levels.filter((level) => level.sku.trim() && level.uomId && level.price !== ''),
		[levels],
	);

	const updateLevel = (key: string, patch: Partial<ChainLevel>) => {
		setLevels((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
	};

	const addOuterPack = () => {
		setLevels((prev) => [
			createLevel({
				key: `outer-${Date.now()}`,
				label: 'Outer pack',
				childQtyPerParent: '1',
				autoBreakEnabled: false,
			}),
			...prev,
		]);
	};

	const removeLevel = (key: string) => {
		setLevels((prev) => (prev.length <= 1 ? prev : prev.filter((row) => row.key !== key)));
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		if(!vendorId) {
			setError('Choose a vendor.');
			return;
		}
		if(!title.trim() || !slug.trim()) {
			setError('Title and product URL are required.');
			return;
		}
		if(activeLevels.length === 0) {
			setError('Fill in at least one offering with SKU, UOM, and price.');
			return;
		}

		for(let index = 0; index < activeLevels.length - 1; index += 1) {
			const parent = activeLevels[index];
			if(parent.inheritQtyToChildren && !parent.autoBreakEnabled) {
				setError(
					`${parent.label || parent.sku}: qty inheritance requires auto-break enabled.`,
				);
				return;
			}
			if(!parent.childQtyPerParent || Number(parent.childQtyPerParent) <= 0) {
				setError(`${parent.label || parent.sku}: enter how many child units one parent contains.`);
				return;
			}
		}

		const offerings: CreateProductPayload['offerings'] = activeLevels.map((level, index) => {
			const isLeaf = index === activeLevels.length - 1;
			const hasChild = !isLeaf;
			const parent = index > 0 ? activeLevels[index - 1] : null;
			const inheritsFromParent =
				Boolean(parent?.inheritQtyToChildren && parent.autoBreakEnabled);
			const role =
				activeLevels.length === 1
					? 'STANDALONE'
					: isLeaf
						? 'PIECE'
						: 'PACK';

			return {
				clientKey: level.key,
				offeringKey: level.key,
				sku: level.sku.trim(),
				uomId: level.uomId,
				role,
				priceCents: dollarsToCents(level.price),
				qtyOnHand: inheritsFromParent ? '0' : level.qtyOnHand || '0',
				tracksOwnQty: !inheritsFromParent,
				minUnbrokenQty: hasChild
					? (level.autoBreakEnabled ? level.minUnbrokenQty || '0' : '-1')
					: '-1',
				breakPoolAboveQty: hasChild ? level.breakPoolAboveQty || '0' : '0',
				inheritQtyToChildren: hasChild
					? level.inheritQtyToChildren && level.autoBreakEnabled
					: false,
			};
		});

		const containments: NonNullable<CreateProductPayload['containments']> = [];
		for(let index = 0; index < activeLevels.length - 1; index += 1) {
			const parent = activeLevels[index];
			const child = activeLevels[index + 1];
			const feeRaw = parent.linkBreakFeeCents.trim();
			containments.push({
				parentOfferingKey: parent.key,
				childOfferingKey: child.key,
				childQtyPerParent: parent.childQtyPerParent || '1',
				breakFeeCents:
					feeRaw === ''
						? undefined
						: dollarsToCents(feeRaw),
			});
		}

		setSubmitting(true);
		try {
			const product = await createCatalogProduct({
				vendorId,
				categoryId: categoryId || undefined,
				slug: slug.trim(),
				title: title.trim(),
				description: description.trim() || undefined,
				tags,
				breakFeeMode: breakFeeMode === 'OFF' ? undefined : breakFeeMode,
				breakFeeCents:
					breakFeeMode === 'OFF'
						? undefined
						: dollarsToCents(breakFeeDollars || '0'),
				inventoryFromAllocations: activeLevels.some(
					(level, index) =>
						index < activeLevels.length - 1
						&& level.inheritQtyToChildren
						&& level.autoBreakEnabled,
				),
				offerings,
				containments: containments.length > 0 ? containments : undefined,
			});

			router.push(`/shop/${product.vendor.slug}/${product.slug}`);
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
			<CatalogWorkspaceSwitcher active="inventory" />

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
					Inventory configuration
				</p>
				<h1
					className="
						mt-2
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Pack chains & break rules
				</h1>
				<p
					className="
						mt-2
						max-w-3xl
						text-slate-600
					"
				>
					Build nested offerings (pallet → spool → foot), set per-pack auto-break floors and
					ceilings, qty inheritance, and optional break fees. Leave outer pack SKU blank to
					skip that level.
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
								href="/shop/vendors"
							>
								Go to vendors
							</a>
						</p>
					)
				: null}

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
							{categories.map((category) => (
								<option
									key={category.id}
									value={category.id}
								>
									{category.name}
								</option>
							))}
						</select>
					</label>
				</div>

				<label className="block text-sm">
					<span className="font-semibold">
						Listing title
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

				<UrlSlugField
					label="Product URL"
					value={slug}
					onChange={(next) => {
						setSlugTouched(true);
						setSlug(slugify(next));
					}}
					prefixPath={`/shop/${selectedVendor?.slug || 'your-store'}`}
					placeholder="product-name"
					helpText="Storefront page for this listing. Each offering still has its own SKU."
				/>

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

				<div
					className="
						flex
						flex-wrap
						items-center
						justify-between
						gap-3
					"
				>
					<h2 className="text-lg font-semibold">
						Offering chain
					</h2>
					<button
						className="
							rounded-full
							border
							border-slate-300
							px-3
							py-1.5
							text-sm
							font-semibold
							text-slate-700
							hover:border-sky
							hover:text-sky
						"
						type="button"
						onClick={addOuterPack}
					>
						Add larger pack level
					</button>
				</div>

				{levels.map((level, index) => {
					const hasChild = index < levels.length - 1;
					const isOptionalOuter = index === 0 && levels.length > 1;

					return (
						<section
							className="
								rounded-xl
								border
								border-slate-200
								bg-slate-50
								p-4
							"
							key={level.key}
						>
							<div
								className="
									flex
									flex-wrap
									items-start
									justify-between
									gap-3
								"
							>
								<div>
									<p
										className="
											text-xs
											font-semibold
											uppercase
											tracking-wide
											text-slate-500
										"
									>
										Level {index + 1}
										{isOptionalOuter
											? ' · leave SKU blank to skip'
											: ''}
									</p>
									<input
										className="
											mt-1
											w-full
											max-w-xs
											border-0
											bg-transparent
											text-base
											font-semibold
											text-ink
											outline-none
										"
										value={level.label}
										onChange={(event) =>
											updateLevel(level.key, { label: event.target.value })
										}
										aria-label="Level label"
									/>
								</div>
								{levels.length > 1
									? (
											<button
												className="
													text-xs
													font-semibold
													text-slate-500
													hover:text-red-700
												"
												type="button"
												onClick={() => removeLevel(level.key)}
											>
												Remove
											</button>
										)
									: null}
							</div>

							<div
								className="
									mt-3
									grid
									gap-3
									md:grid-cols-2
									lg:grid-cols-4
								"
							>
								<label className="block text-sm">
									<span className="font-semibold">
										SKU
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
										value={level.sku}
										onChange={(event) =>
											updateLevel(level.key, { sku: event.target.value })
										}
										placeholder={
											isOptionalOuter
												? 'Optional'
												: 'Required'
										}
									/>
								</label>
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
										value={level.uomId}
										onChange={(event) =>
											updateLevel(level.key, { uomId: event.target.value })
										}
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
										value={level.price}
										onChange={(event) =>
											updateLevel(level.key, { price: event.target.value })
										}
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
										value={level.qtyOnHand}
										onChange={(event) =>
											updateLevel(level.key, { qtyOnHand: event.target.value })
										}
									/>
								</label>
							</div>

							{hasChild
								? (
										<div
											className="
												mt-4
												space-y-3
												border-t
												border-slate-200
												pt-4
											"
										>
											<label className="block text-sm">
												<span className="font-semibold">
													Child units per one of these
												</span>
												<input
													className="
														mt-1
														w-full
														max-w-xs
														rounded-lg
														border
														border-slate-300
														px-3
														py-2
													"
													value={level.childQtyPerParent}
													onChange={(event) =>
														updateLevel(level.key, {
															childQtyPerParent: event.target.value,
														})
													}
												/>
											</label>

											<div
												className="
													rounded-lg
													border
													border-slate-200
													bg-white
													p-3
												"
											>
												<p className="text-sm font-semibold">
													Pack breaking
												</p>
												<p
													className="
														mt-1
														text-xs
														text-slate-500
													"
												>
													Opened remainders always count toward the child. These controls
													only govern automatic opening of whole packs.
												</p>
												<label
													className="
														mt-3
														flex
														items-center
														gap-2
														text-sm
													"
												>
													<input
														type="checkbox"
														checked={level.autoBreakEnabled}
														onChange={(event) =>
															updateLevel(level.key, {
																autoBreakEnabled: event.target.checked,
																inheritQtyToChildren:
																	event.target.checked
																		? level.inheritQtyToChildren
																		: false,
															})
														}
													/>
													Allow auto-break
												</label>
												<div
													className="
														mt-3
														grid
														gap-3
														md:grid-cols-2
													"
												>
													<label className="block text-sm">
														<span className="font-semibold">
															Keep at least N unbroken
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
																disabled:opacity-60
															"
															value={level.minUnbrokenQty}
															onChange={(event) =>
																updateLevel(level.key, {
																	minUnbrokenQty: event.target.value,
																})
															}
															disabled={!level.autoBreakEnabled}
														/>
													</label>
													<label className="block text-sm">
														<span className="font-semibold">
															Only break inventory above
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
															value={level.breakPoolAboveQty}
															onChange={(event) =>
																updateLevel(level.key, {
																	breakPoolAboveQty: event.target.value,
																})
															}
														/>
														<span
															className="
																mt-1
																block
																text-xs
																text-slate-500
															"
														>
															First X units stay full-pack only.
														</span>
													</label>
												</div>
												<label
													className="
														mt-3
														flex
														items-center
														gap-2
														text-sm
													"
												>
													<input
														type="checkbox"
														checked={level.inheritQtyToChildren}
														disabled={!level.autoBreakEnabled}
														onChange={(event) =>
															updateLevel(level.key, {
																inheritQtyToChildren: event.target.checked,
															})
														}
													/>
													Count eligible wholes toward child availability
												</label>
												<label
													className="
														mt-3
														block
														text-sm
													"
												>
													<span className="font-semibold">
														Link break fee override ($)
													</span>
													<input
														className="
															mt-1
															w-full
															max-w-xs
															rounded-lg
															border
															border-slate-300
															px-3
															py-2
														"
														value={level.linkBreakFeeCents}
														onChange={(event) =>
															updateLevel(level.key, {
																linkBreakFeeCents: event.target.value,
															})
														}
														placeholder="Use product default"
													/>
												</label>
											</div>
										</div>
									)
								: null}
						</section>
					);
				})}

				<details
					className="
						rounded-xl
						border
						border-slate-200
						p-4
					"
				>
					<summary
						className="
							cursor-pointer
							text-sm
							font-semibold
							text-slate-700
						"
					>
						Break fees (product default)
					</summary>
					<div
						className="
							mt-4
							grid
							gap-3
							md:grid-cols-2
						"
					>
						<label className="block text-sm">
							<span className="font-semibold">
								Mode
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
								value={breakFeeMode}
								onChange={(event) =>
									setBreakFeeMode(event.target.value as BreakFeeMode)
								}
							>
								<option value="OFF">
									Off ($0)
								</option>
								<option value="PER_PARENT_OPENED">
									Per parent opened
								</option>
								<option value="ONCE_PER_LINE">
									Once per line per level
								</option>
								<option value="PRODUCT_ONCE">
									Once per product
								</option>
							</select>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">
								Default fee ($)
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
									disabled:opacity-60
								"
								value={breakFeeDollars}
								onChange={(event) => setBreakFeeDollars(event.target.value)}
								disabled={breakFeeMode === 'OFF'}
							/>
						</label>
					</div>
				</details>

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
						: 'Create configured product'}
				</button>
			</form>
		</div>
	);
}

export default function InventoryConfigurationPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<RequireAccess vendorRequired reasonKey="products">
				<InventoryConfigurationForm />
			</RequireAccess>
		</Suspense>
	);
}
