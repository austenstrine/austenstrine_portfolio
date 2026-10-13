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
import {
	beginWalkthrough,
	dismissWalkthrough,
	saveWalkthroughState,
} from '../../../../lib/walkthrough';
import { useSession } from '../../../../lib/useSession';
import { CatalogWorkspaceSwitcher } from '../../../../components/catalog/CatalogWorkspaceSwitcher';
import { UrlSlugField } from '../../../../components/catalog/UrlSlugField';
import { TutorialBanner } from '../../../../components/tutorial/TutorialBanner';
import { TutorialSpotlight } from '../../../../components/tutorial/TutorialSpotlight';

type OfferingMode = 'SINGLE' | 'PACK' | 'PIECE' | 'BOTH';
type WizardStep = 'basics' | 'pack' | 'piece' | 'review';

const WIZARD_STEPS: WizardStep[] = ['basics', 'pack', 'piece', 'review'];

const WIZARD_SPOTLIGHT: Record<WizardStep, string> = {
	basics: 'product-basics',
	pack: 'product-pack',
	piece: 'product-piece',
	review: 'product-review',
};

function NewProductForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const walkthrough = searchParams.get('walkthrough') === '1';
	const { user, loading: sessionLoading } = useSession();

	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [vendorId, setVendorId] = useState(searchParams.get('vendorId') ?? '');
	const [categoryId, setCategoryId] = useState(searchParams.get('categoryId') ?? '');
	const [title, setTitle] = useState(walkthrough ? 'THHN 12 AWG Copper Wire' : '');
	const [sku, setSku] = useState(walkthrough ? 'WIRE-THHN-12' : '');
	const [slug, setSlug] = useState(walkthrough ? 'thhn-12-gauge-wire' : '');
	const [slugTouched, setSlugTouched] = useState(walkthrough);
	const [description, setDescription] = useState(
		walkthrough
			? 'Sold as a full spool or by the foot, with shared pack/piece inventory.'
			: '',
	);
	const [offeringMode, setOfferingMode] = useState<OfferingMode>(
		walkthrough ? 'BOTH' : 'SINGLE',
	);
	const [packUomId, setPackUomId] = useState('');
	const [pieceUomId, setPieceUomId] = useState('');
	const [singleUomId, setSingleUomId] = useState('');
	const [packPrice, setPackPrice] = useState(walkthrough ? '89.99' : '');
	const [piecePrice, setPiecePrice] = useState(walkthrough ? '0.22' : '');
	const [singlePrice, setSinglePrice] = useState('');
	const [packQty, setPackQty] = useState(walkthrough ? '3' : '0');
	const [pieceQty, setPieceQty] = useState('0');
	const [singleQty, setSingleQty] = useState('0');
	const [pieceQtyPerPack, setPieceQtyPerPack] = useState(walkthrough ? '500' : '');
	const [wizardStep, setWizardStep] = useState<WizardStep>('basics');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		if(walkthrough) {
			beginWalkthrough();
		}
	}, [walkthrough]);

	useEffect(() => {
		if(!user) {
			return;
		}

		Promise.all([listMyVendors(), listCatalogCategories(), listUoms()])
			.then(([vendorRows, categoryRows, uomRows]) => {
				setVendors(vendorRows);
				setCategories(categoryRows);
				setUoms(uomRows);

				if(!vendorId && vendorRows[0]) {
					setVendorId(vendorRows[0].id);
				}
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

	const effectiveMode: OfferingMode = walkthrough ? 'BOTH' : offeringMode;

	const needsPack =
		effectiveMode === 'PACK' || effectiveMode === 'BOTH';
	const needsPiece =
		effectiveMode === 'PIECE' || effectiveMode === 'BOTH';
	const needsSingle = effectiveMode === 'SINGLE';

	const singleSku = sku.trim();
	const packSku = walkthrough
		? 'WIRE-THHN-12-SPOOL'
		: effectiveMode === 'BOTH'
			? `${sku.trim()}-PACK`
			: sku.trim();
	const pieceSku = walkthrough
		? 'WIRE-THHN-12-FT'
		: effectiveMode === 'BOTH'
			? `${sku.trim()}-PIECE`
			: sku.trim();

	const wizardIndex = WIZARD_STEPS.indexOf(wizardStep);

	const showBasics = !walkthrough || wizardStep === 'basics';
	const showPack = needsPack && (!walkthrough || wizardStep === 'pack');
	const showPiece = needsPiece && (!walkthrough || wizardStep === 'piece');
	const showSingle = needsSingle && !walkthrough;
	const showReview = walkthrough && wizardStep === 'review';

	const buildPayload = (): CreateProductPayload => {
		const offerings: CreateProductPayload['offerings'] = [];

		if(needsSingle) {
			offerings.push({
				clientKey: 'single',
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
				sku: packSku,
				uomId: packUomId,
				role: 'PACK',
				priceCents: dollarsToCents(packPrice),
				qtyOnHand: packQty || '0',
				tracksOwnQty: true,
				...(effectiveMode === 'BOTH'
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
				sku: pieceSku,
				uomId: pieceUomId,
				role: 'PIECE',
				priceCents: dollarsToCents(piecePrice),
				qtyOnHand:
					effectiveMode === 'BOTH'
						? '0'
						: pieceQty || '0',
				tracksOwnQty: effectiveMode !== 'BOTH',
			});
		}

		const containments: CreateProductPayload['containments'] =
			effectiveMode === 'BOTH'
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
			inventoryFromAllocations: effectiveMode === 'BOTH',
			attributes: walkthrough
				? [
						{ key: 'gauge', value: '12 AWG', sortOrder: 0 },
						{ key: 'conductor', value: 'Copper', sortOrder: 1 },
					]
				: undefined,
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
		if(effectiveMode === 'BOTH' && (!pieceQtyPerPack || Number(pieceQtyPerPack) <= 0)) {
			return 'Enter how many piece units are in one pack.';
		}
		return null;
	};

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		if(walkthrough && wizardStep !== 'review') {
			return;
		}

		const validationError = validateForSubmit();
		if(validationError) {
			setError(validationError);
			return;
		}

		setSubmitting(true);
		try {
			const product = await createCatalogProduct(buildPayload());

			saveWalkthroughState({
				vendorId,
				vendorSlug: selectedVendor?.slug,
				categoryId: categoryId || undefined,
				productSlug: product.slug,
			});

			router.push(
				walkthrough
					? `/shop/start?done=1&vendor=${encodeURIComponent(product.vendor.slug)}&product=${encodeURIComponent(product.slug)}`
					: `/shop/${product.vendor.slug}/${product.slug}`,
			);
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

	const goNextWizard = () => {
		setError(null);
		if(wizardStep === 'basics') {
			if(!vendorId || !title.trim() || !sku.trim() || !slug.trim()) {
				setError('Fill in vendor, title, SKU, and product URL before continuing.');
				return;
			}
			setWizardStep('pack');
			return;
		}
		if(wizardStep === 'pack') {
			if(!packUomId || !packPrice) {
				setError('Choose a pack UOM and price before continuing.');
				return;
			}
			setWizardStep('piece');
			return;
		}
		if(wizardStep === 'piece') {
			if(!pieceUomId || !piecePrice || !pieceQtyPerPack) {
				setError('Fill in piece UOM, price, and qty per pack before reviewing.');
				return;
			}
			setWizardStep('review');
		}
	};

	const goBackWizard = () => {
		setError(null);
		const index = WIZARD_STEPS.indexOf(wizardStep);
		if(index > 0) {
			setWizardStep(WIZARD_STEPS[index - 1]);
		}
	};

	const onSkipWalkthrough = () => {
		dismissWalkthrough();
		router.push('/shop/products/new');
	};

	if(sessionLoading) {
		return (
			<p className="text-sm text-slate-500">
				Checking session…
			</p>
		);
	}

	if(!user) {
		return (
			<p className="text-sm text-amber-800">
				Sign in to create products.
				{' '}
				<a
					className="
						font-semibold
						text-sky
						hover:underline
					"
					href="/auth/login"
				>
					Sign in
				</a>
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
			{walkthrough
				? (
						<>
							<TutorialBanner
								step="product"
								onSkip={onSkipWalkthrough}
							/>
							<TutorialSpotlight
								target={WIZARD_SPOTLIGHT[wizardStep]}
							/>
						</>
					)
				: (
						<CatalogWorkspaceSwitcher active="standard" />
					)}

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
					{walkthrough
						? 'Create sample product'
						: 'Create product'}
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					{walkthrough
						? 'Walk through basics, pack, and piece offerings, then review before creating a shared-inventory listing.'
						: 'Create a simple catalog listing as a single unit, pack, piece, or linked pack/piece pair.'}
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
								href="/shop/uoms"
							>
								Manage UOMs
							</a>
						</p>
					)
				: null}

			{walkthrough
				? (
						<div
							className="
								flex
								flex-wrap
								gap-2
							"
						>
							{WIZARD_STEPS.map((step, index) => {
								const active = step === wizardStep;
								const done = index < wizardIndex;
								return (
									<span
										className={
											active
												? 'rounded-full bg-ink px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white'
												: done
													? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800'
													: 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500'
										}
										key={step}
									>
										{index + 1}. {step}
									</span>
								);
							})}
						</div>
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
				{showBasics
					? (
							<section
								className="
									flex
									flex-col
									gap-4
								"
								data-tutorial="product-basics"
							>
								{!walkthrough
									? (
											<label className="block text-sm">
												<span className="font-semibold">
													Offering mode
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
											</label>
										)
									: null}

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
											{effectiveMode === 'BOTH'
												? 'Base SKU'
												: 'SKU'}
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
										{effectiveMode === 'BOTH'
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
											: null}
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
							</section>
						)
					: null}

				{showSingle
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
					: null}

				{showPack
					? (
							<section
								className="
									rounded-xl
									border
									border-slate-100
									bg-slate-50
									p-4
								"
								data-tutorial="product-pack"
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
					: null}

				{showPiece
					? (
							<section
								className="
									rounded-xl
									border
									border-slate-100
									bg-slate-50
									p-4
								"
								data-tutorial="product-piece"
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
									{effectiveMode === 'BOTH'
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
											)}
								</div>
							</section>
						)
					: null}

				{showReview && walkthrough
					? (
							<section
								className="
									rounded-xl
									border
									border-slate-200
									bg-slate-50
									p-4
								"
								data-tutorial="product-review"
							>
								<h2 className="font-semibold">
									Review
								</h2>
								<ul
									className="
										mt-3
										space-y-1
										text-sm
										text-slate-700
									"
								>
									<li>
										Title: {title}
									</li>
									<li>
										Pack SKU: {packSku} · ${packPrice} · qty {packQty}
									</li>
									<li>
										Piece SKU: {pieceSku} · ${piecePrice} · {pieceQtyPerPack} per pack
									</li>
									<li>
										URL: /shop/{selectedVendor?.slug || '…'}/{slug}
									</li>
								</ul>
							</section>
						)
					: null}

				{error
					? (
							<p className="text-sm text-red-700">
								{error}
							</p>
						)
					: null}

				<div
					className="
						flex
						flex-wrap
						items-center
						gap-3
					"
				>
					{walkthrough && wizardStep !== 'basics'
						? (
								<button
									className="
										rounded-full
										border
										border-slate-300
										px-4
										py-2.5
										text-sm
										font-semibold
										text-slate-700
										hover:border-sky
										hover:text-sky
									"
									type="button"
									onClick={goBackWizard}
								>
									Back
								</button>
							)
						: null}

					{walkthrough && wizardStep !== 'review'
						? (
								<button
									className="
										rounded-full
										bg-ink
										px-4
										py-2.5
										text-sm
										font-semibold
										text-white
										hover:bg-sky
									"
									type="button"
									onClick={goNextWizard}
								>
									Continue
								</button>
							)
						: (
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
										: 'Create product'}
								</button>
							)}
				</div>
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
			<NewProductForm />
		</Suspense>
	);
}
