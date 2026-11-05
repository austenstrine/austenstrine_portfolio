'use client';

/**
 * ProductEditorForm — one form for four surfaces:
 *
 * | Intent  | Surface  | Route                                      |
 * |---------|-----------|--------------------------------------------|
 * | create  | standard  | /place-et-marque/products/new?vendorId=<slug> |
 * | create  | advanced  | /place-et-marque/products/configure?vendorId=<slug> |
 * | edit    | standard  | /place-et-marque/<vendor>/<product>/edit   |
 * | edit    | advanced  | /place-et-marque/<vendor>/<product>/configure |
 *
 * Conditionals that matter while reading this file:
 * - `productEditorIntent` — create vs edit (edit needs existingProductId / loaded product)
 * - `productEditorSurface` — standard uses in-place question prompts (progressive
 *   disclosure); advanced forces every section open with no prompt chrome
 * - `advancedFeatureEnabled(key)` — whether a section’s fields render
 * - Focused pack/piece switcher — one PackOrPieceDraft at a time; containments chain packs
 *
 * Standard UX: assume a packless piece. Ask “Does this break down into another SKU?”
 * (and similar) only where the extra tools would appear—not a top-of-page toggle list.
 *
 * Frontend copy never says “offering”; use Pack / Piece (see glossary).
 */

import { useRouter } from 'next/navigation';
import {
	useEffect,
	useMemo,
	useRef,
	useState,
	type FormEvent,
} from 'react';
import {
	createCatalogProduct,
	getCatalogProduct,
	getCatalogProductById,
	listCatalogAttributes,
	listCatalogCategories,
	listMyVendors,
	listUoms,
	updateCatalogProduct,
	type CatalogAttributeDefinition,
	type CreateProductPayload,
	type ProductMeasuresPayload,
	type UnitOfMeasure,
	type VendorSummary,
} from '../../lib/catalog-api';
import {
	ADVANCED_FEATURE_PROMPTS,
	centsToDollars,
	createPackOrPieceDraft,
	DEFAULT_ADVANCED_FEATURE_TOGGLES,
	dollarsToCents,
	pricePerLabel,
	slugify,
	type AdvancedFeatureKey,
	type ContainmentDraft,
	type PackOrPieceDraft,
	type ProductEditorIntent,
	type ProductEditorSurface,
} from '../../lib/catalog-product-form';
import { sortCategoryTree } from '../../lib/category-tree';
import { useSession } from '../../lib/useSession';
import {
	isUuidLike,
	matchVendorByRef,
	productCreateHref,
	productEditHref,
	productPathNeedsCanonicalRedirect,
	productViewHref,
	vendorUrlRef,
} from '../../lib/vendor-ref';
import { PencilIcon } from '../icons/PencilIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { CatalogImageField } from './CatalogImageField';
import {
	PageBottomPanePortal,
	SellerTopContextPortal,
} from './CatalogSearchContext';
import { CatalogWorkspaceSwitcher } from './CatalogWorkspaceSwitcher';
import { CompoundQtyField } from './CompoundQtyField';
import { DisclosurePrompt } from './DisclosurePrompt';
import { ProductAttributeField } from './ProductAttributeField';
import {
	emptyProductMeasures,
	ProductMeasuresField,
} from './ProductMeasuresField';
import { ProductTagField } from './ProductTagField';
import { TermHint } from './TermHint';
import { UrlSlugField } from './UrlSlugField';

type ProductEditorFormProps = {
	productEditorSurface: ProductEditorSurface;
	productEditorIntent: ProductEditorIntent;
	/** Legacy UUID edit load; prefer existingVendorSlug + existingProductSlug. */
	existingProductId?: string;
	existingVendorSlug?: string;
	existingProductSlug?: string;
	/** Create: vendor slug or UUID from ?vendorId=. */
	initialVendorId?: string;
	initialCategoryId?: string;
};

type BreakFeeMode = 'OFF' | 'PER_PARENT_OPENED' | 'ONCE_PER_LINE' | 'PRODUCT_ONCE';

export function ProductEditorForm({
	productEditorSurface,
	productEditorIntent,
	existingProductId,
	existingVendorSlug = '',
	existingProductSlug = '',
	initialVendorId = '',
	initialCategoryId = '',
}: ProductEditorFormProps) {
	const router = useRouter();
	const { user } = useSession();
	const isCreating = productEditorIntent === 'create';
	const isAdvancedSurface = productEditorSurface === 'advanced';
	/** One-shot create default: only membership / ?vendorId, never re-fill after clear. */
	const vendorBootstrapDone = useRef(false);

	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [categories, setCategories] = useState<Array<{
		id: string;
		name: string;
		slug: string;
		parent?: { id: string; name: string; slug: string } | null;
	}>>([]);
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [attributeCatalog, setAttributeCatalog] = useState<CatalogAttributeDefinition[]>([]);
	const categoryTree = sortCategoryTree(categories);

	const [resolvedProductId, setResolvedProductId] = useState(
		existingProductId ?? '',
	);
	const [resolvedVendorSlug, setResolvedVendorSlug] = useState(
		existingVendorSlug,
	);
	const [resolvedProductSlug, setResolvedProductSlug] = useState(
		existingProductSlug,
	);
	/** Internal UUID only — URL query may carry a slug until bootstrap resolves. */
	const [vendorId, setVendorId] = useState(
		() => (isUuidLike(initialVendorId) ? initialVendorId.trim() : ''),
	);
	const [categoryId, setCategoryId] = useState(initialCategoryId);
	const [title, setTitle] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [description, setDescription] = useState('');
	const [imageUrls, setImageUrls] = useState<string[]>([]);
	const [tags, setTags] = useState<string[]>([]);
	const [breakFeeMode, setBreakFeeMode] = useState<BreakFeeMode>('OFF');
	const [breakFeeDollars, setBreakFeeDollars] = useState('0');
	const [selectedAttributeValueIds, setSelectedAttributeValueIds] = useState<string[]>([]);
	const [measures, setMeasures] = useState<ProductMeasuresPayload>(emptyProductMeasures);
	const [scalarValues, setScalarValues] = useState<Record<string, string>>({});

	const [advancedFeatureToggles, setAdvancedFeatureToggles] = useState(
		() => ({ ...DEFAULT_ADVANCED_FEATURE_TOGGLES }),
	);

	const [packOrPieceRows, setPackOrPieceRows] = useState<PackOrPieceDraft[]>([
		createPackOrPieceDraft('PIECE', { label: 'Piece', breakable: false }),
	]);
	const [focusedClientKey, setFocusedClientKey] = useState(
		() => packOrPieceRows[0]?.clientKey ?? '',
	);
	const [containments, setContainments] = useState<ContainmentDraft[]>([]);

	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [loadingExisting, setLoadingExisting] = useState(
		productEditorIntent === 'edit',
	);

	const advancedFeatureEnabled = (feature: AdvancedFeatureKey): boolean => {
		if(isAdvancedSurface) {
			return true;
		}
		return advancedFeatureToggles[feature];
	};

	const setAdvancedFeature = (feature: AdvancedFeatureKey, enabled: boolean) => {
		setAdvancedFeatureToggles((prev) => ({
			...prev,
			[feature]: enabled,
		}));
	};

	/** Expand pack breakdown: ensure a pack exists and links to the current piece. */
	const enablePackBreakdown = () => {
		setAdvancedFeatureToggles((prev) => ({
			...prev,
			packsAndPieces: true,
		}));

		setPackOrPieceRows((prev) => {
			const piece = prev.find((row) => row.role === 'PIECE') ?? prev[0];
			const hasPack = prev.some((row) => row.role === 'PACK');
			if(hasPack || !piece) {
				return prev;
			}
			const pack = createPackOrPieceDraft('PACK', {
				uomId: uoms.find((row) => row.code === 'EA')?.id ?? uoms[0]?.id ?? piece.uomId,
				label: 'Pack',
				breakable: true,
				inheritQtyToChildren: true,
			});
			setFocusedClientKey(piece.clientKey);
			setContainments((links) => {
				if(links.some((link) => link.childClientKey === piece.clientKey)) {
					return links;
				}
				return [
					...links,
					{
						parentClientKey: pack.clientKey,
						childClientKey: piece.clientKey,
						childQtyPerParent: '1',
					},
				];
			});
			return [...prev, pack];
		});
	};

	const collapsePackBreakdown = () => {
		setAdvancedFeatureToggles((prev) => ({
			...prev,
			packsAndPieces: false,
			breakFees: false,
			packBreakRules: false,
		}));
		setContainments([]);
		setPackOrPieceRows((prev) => {
			const piece = prev.find((row) => row.role === 'PIECE') ?? prev[0];
			if(!piece) {
				return [createPackOrPieceDraft('PIECE')];
			}
			setFocusedClientKey(piece.clientKey);
			return [{
				...piece,
				role: 'PIECE',
				breakable: false,
				inheritQtyToChildren: false,
			}];
		});
	};

	useEffect(() => {
		if(!user) {
			return;
		}

		Promise.all([listMyVendors(), listCatalogCategories()])
			.then(async ([vendorRows, categoryRows]) => {
				setVendors(vendorRows);
				setCategories(categoryRows);

				let selected = vendorId;
				if(isCreating && !vendorBootstrapDone.current) {
					vendorBootstrapDone.current = true;
					const fromQuery = matchVendorByRef(vendorRows, initialVendorId);
					if(fromQuery) {
						selected = fromQuery.id;
						setVendorId(fromQuery.id);
					}
					else if(!selected && vendorRows.length === 1) {
						selected = vendorRows[0]?.id || '';
						if(selected) {
							setVendorId(selected);
						}
					}
					else if(
						selected
						&& !vendorRows.some((row) => row.id === selected)
					) {
						selected = '';
						setVendorId('');
					}
					// Multi-vendor create with no query: leave empty until pick.
				}

				const uomRows = await listUoms(selected || undefined).catch(() => []);
				setUoms(uomRows);
				const attrs = await listCatalogAttributes(selected || undefined).catch(() => []);
				setAttributeCatalog(attrs);

				const each = uomRows.find((row) => row.code === 'EA') ?? uomRows[0];
				if(each && isCreating) {
					setPackOrPieceRows((prev) => prev.map((row) => ({
						...row,
						uomId: row.uomId || each.id,
					})));
				}
			})
			.catch(() => undefined);
	}, [user, vendorId, isCreating, initialVendorId]);

	useEffect(() => {
		if(productEditorIntent !== 'edit' || !user) {
			return;
		}
		const vendorRef = existingVendorSlug.trim();
		const productRef = existingProductSlug.trim();
		const hasSlugPair = Boolean(vendorRef && productRef);
		const hasId = Boolean(existingProductId?.trim());
		if(!hasSlugPair && !hasId) {
			return;
		}

		setLoadingExisting(true);
		const load = hasId
			? getCatalogProductById(existingProductId!)
			: isUuidLike(productRef)
				? getCatalogProductById(productRef)
				: getCatalogProduct(vendorRef, productRef);
		load
			.then(async (product) => {
				setResolvedProductId(product.id);
				setResolvedVendorSlug(product.vendor.slug);
				setResolvedProductSlug(product.slug);
				setVendorId(product.vendor.id ?? '');
				if(
					hasSlugPair
					&& productPathNeedsCanonicalRedirect(
						{
							vendorSlug: vendorRef,
							productSlug: productRef,
						},
						{
							vendorSlug: product.vendor.slug,
							productSlug: product.slug,
						},
					)
				) {
					router.replace(
						productEditHref(
							{
								vendorSlug: product.vendor.slug,
								productSlug: product.slug,
							},
							productEditorSurface,
						),
					);
				}
				const categoryRows = await listCatalogCategories().catch(() => []);
				setCategories(categoryRows);
				const matchedCategoryId = categoryRows.find(
					(row) => row.slug === product.category?.slug,
				)?.id;
				setCategoryId(matchedCategoryId || initialCategoryId || '');
				setTitle(product.title);
				setSlug(product.slug);
				setSlugTouched(true);
				setDescription(product.description ?? '');
				setImageUrls(product.imageUrls ?? []);
				setTags(product.tags ?? []);
				setBreakFeeMode(
					(product.breakFeeMode as BreakFeeMode | undefined) ?? 'OFF',
				);
				setBreakFeeDollars(centsToDollars(product.breakFeeCents ?? 0));
				setSelectedAttributeValueIds(product.attributes.map((row) => row.id));
				const loadedMeasures = {
					...emptyProductMeasures(),
					lengthNumeric: product.lengthNumeric ?? '',
					widthNumeric: product.widthNumeric ?? '',
					heightNumeric: product.heightNumeric ?? '',
					linearUnit: product.linearUnit ?? 'in',
					weightNumeric: product.weightNumeric ?? '',
					weightUnit: product.weightUnit ?? 'lb',
					packageLengthNumeric: product.packageLengthNumeric ?? '',
					packageWidthNumeric: product.packageWidthNumeric ?? '',
					packageHeightNumeric: product.packageHeightNumeric ?? '',
					packageLinearUnit: product.packageLinearUnit ?? 'in',
					packageWeightNumeric: product.packageWeightNumeric ?? '',
					packageWeightUnit: product.packageWeightUnit ?? 'lb',
					volumeNumeric: product.volumeNumeric ?? '',
					volumeUnit: product.volumeUnit ?? '',
					voltageNumeric: product.voltageNumeric ?? '',
					wattageNumeric: product.wattageNumeric ?? '',
					amperageNumeric: product.amperageNumeric ?? '',
					gtin: product.gtin ?? '',
					mpn: product.mpn ?? '',
					countryOfOrigin: product.countryOfOrigin ?? '',
					condition: product.condition ?? 'NA',
				};
				setMeasures(loadedMeasures);
				const nextScalars: Record<string, string> = {};
				for(const row of product.scalarValues ?? []) {
					nextScalars[row.attributeId] =
						row.stringValue
						?? row.numericValue
						?? (row.booleanValue == null ? '' : row.booleanValue ? 'true' : 'false');
				}
				setScalarValues(nextScalars);

				const uomRows = await listUoms(product.vendor.id).catch(() => []);
				setUoms(uomRows);
				const attrs = await listCatalogAttributes(product.vendor.id).catch(() => []);
				setAttributeCatalog(attrs);

				const drafts: PackOrPieceDraft[] = product.offerings.map((offering) =>
					createPackOrPieceDraft(
						offering.role === 'PACK' ? 'PACK' : 'PIECE',
						{
							clientKey: offering.offeringKey || offering.id,
							id: offering.id,
							label: offering.role === 'PACK' ? `Pack (${offering.sku})` : `Piece (${offering.sku})`,
							sku: offering.sku,
							uomId: uomRows.find((row) => row.code === offering.uom.code)?.id ?? '',
							price: centsToDollars(offering.priceCents),
							qtyOnHand: offering.qtyOnHand,
							breakable:
								offering.role === 'PACK'
								&& (offering.inheritQtyToChildren || offering.minUnbrokenQty !== '-1'),
							minUnbrokenQty: offering.minUnbrokenQty,
							breakPoolAboveQty: offering.breakPoolAboveQty,
							inheritQtyToChildren: offering.inheritQtyToChildren,
						},
					),
				);
				setPackOrPieceRows(
					drafts.length > 0
						? drafts
						: [createPackOrPieceDraft('PIECE')],
				);
				setFocusedClientKey(drafts[0]?.clientKey ?? '');

				const links: ContainmentDraft[] = [];
				for(const offering of product.offerings) {
					for(const child of offering.childContainments ?? []) {
						const childOffering = product.offerings.find(
							(row) => row.id === child.childOfferingId,
						);
						if(!childOffering) {
							continue;
						}
						links.push({
							parentClientKey: offering.offeringKey || offering.id,
							childClientKey: childOffering.offeringKey || childOffering.id,
							childQtyPerParent: child.childQtyPerParent,
							breakFeeCents:
								child.breakFeeCents != null
									? String(child.breakFeeCents)
									: undefined,
						});
					}
				}
				setContainments(links);

				const hasMeasureValues = [
					loadedMeasures.lengthNumeric,
					loadedMeasures.widthNumeric,
					loadedMeasures.heightNumeric,
					loadedMeasures.weightNumeric,
					loadedMeasures.packageLengthNumeric,
					loadedMeasures.packageWidthNumeric,
					loadedMeasures.packageHeightNumeric,
					loadedMeasures.packageWeightNumeric,
					loadedMeasures.voltageNumeric,
					loadedMeasures.wattageNumeric,
					loadedMeasures.amperageNumeric,
					loadedMeasures.gtin,
					loadedMeasures.mpn,
				].some((value) => Boolean(value && String(value).trim()))
					|| (loadedMeasures.condition != null && loadedMeasures.condition !== 'NA');

				const loadedBreakFeeMode =
					(product.breakFeeMode as BreakFeeMode | undefined) ?? 'OFF';
				const hasBreakFees =
					loadedBreakFeeMode !== 'OFF'
					|| (product.breakFeeCents ?? 0) > 0
					|| links.some((link) => {
						const cents = Number(link.breakFeeCents ?? 0);
						return Number.isFinite(cents) && cents > 0;
					});
				const hasPackBreakRules = drafts.some(
					(row) =>
						row.role === 'PACK'
						&& (
							row.breakable
							|| row.minUnbrokenQty !== '0'
							|| row.breakPoolAboveQty !== '0'
							|| row.inheritQtyToChildren
						),
				);

				setAdvancedFeatureToggles((prev) => ({
					...prev,
					packsAndPieces: drafts.some((row) => row.role === 'PACK') || links.length > 0,
					measurements: hasMeasureValues,
					breakFees: hasBreakFees,
					packBreakRules: hasPackBreakRules,
				}));
			})
			.catch((loadError) => {
				setError(
					loadError instanceof Error
						? loadError.message
						: 'Failed to load product.',
				);
			})
			.finally(() => setLoadingExisting(false));
	}, [
		productEditorIntent,
		productEditorSurface,
		existingProductId,
		existingVendorSlug,
		existingProductSlug,
		user,
		initialCategoryId,
		router,
	]);

	const selectedVendor = useMemo(
		() => vendors.find((row) => row.id === vendorId) ?? null,
		[vendors, vendorId],
	);

	/**
	 * Keep create URLs on the vendor link name (not UUID) in ?vendorId=.
	 * Resolves against the signed-in user's vendors (selected membership).
	 */
	useEffect(() => {
		if(!isCreating || vendors.length === 0) {
			return;
		}
		const nextRef = selectedVendor
			? vendorUrlRef(selectedVendor)
			: '';
		const currentParams = new URLSearchParams(
			typeof window === 'undefined'
				? ''
				: window.location.search,
		);
		const current = currentParams.get('vendorId') ?? '';
		if(current === nextRef) {
			return;
		}
		/** Avoid wiping a typed slug before membership rows finish matching. */
		if(!nextRef && current && !isUuidLike(current)) {
			return;
		}
		const nextPath = productCreateHref({
			surface: productEditorSurface,
			vendorRef: nextRef || null,
			categoryId: currentParams.get('categoryId') || initialCategoryId || null,
		});
		router.replace(nextPath, { scroll: false });
	}, [
		isCreating,
		vendors.length,
		selectedVendor,
		productEditorSurface,
		initialCategoryId,
		router,
	]);

	const focusedRow = packOrPieceRows.find((row) => row.clientKey === focusedClientKey)
		?? packOrPieceRows[0]
		?? null;
	const focusedUom = uoms.find((row) => row.id === focusedRow?.uomId);

	const updateFocusedRow = (patch: Partial<PackOrPieceDraft>) => {
		if(!focusedRow) {
			return;
		}
		setPackOrPieceRows((prev) => prev.map((row) =>
			row.clientKey === focusedRow.clientKey
				? { ...row, ...patch }
				: row,
		));
	};

	const addPackOrPiece = (role: 'PACK' | 'PIECE') => {
		const draft = createPackOrPieceDraft(role, {
			uomId: uoms.find((row) => row.code === 'EA')?.id ?? uoms[0]?.id ?? '',
		});
		setPackOrPieceRows((prev) => [...prev, draft]);
		setFocusedClientKey(draft.clientKey);
		if(!isAdvancedSurface) {
			setAdvancedFeatureToggles((prev) => ({
				...prev,
				packsAndPieces: true,
			}));
		}
	};

	const addContainmentLink = () => {
		const packs = packOrPieceRows.filter((row) => row.role === 'PACK');
		const children = packOrPieceRows;
		const parent = packs[0];
		const child = children.find((row) => row.clientKey !== parent?.clientKey);
		if(!parent || !child) {
			setError('Add at least one pack and one child pack or piece before linking.');
			return;
		}
		setContainments((prev) => [
			...prev,
			{
				parentClientKey: parent.clientKey,
				childClientKey: child.clientKey,
				childQtyPerParent: '1',
			},
		]);
	};

	const buildCreatePayload = (): CreateProductPayload => {
		const offerings = packOrPieceRows.map((row) => ({
			clientKey: row.clientKey,
			offeringKey: row.clientKey,
			sku: row.sku.trim() || `${slug.trim()}-${row.role.toLowerCase()}`,
			uomId: row.uomId,
			role: row.role,
			priceCents: dollarsToCents(row.price),
			qtyOnHand: row.qtyOnHand || '0',
			tracksOwnQty: !(
				row.role === 'PIECE'
				&& containments.some((link) => link.childClientKey === row.clientKey)
			),
			...(row.role === 'PACK' && row.breakable
				? {
						minUnbrokenQty: row.minUnbrokenQty || '0',
						breakPoolAboveQty: row.breakPoolAboveQty || '0',
						inheritQtyToChildren: true,
					}
				: {
						minUnbrokenQty: '-1',
						inheritQtyToChildren: false,
					}
			),
		}));

		return {
			vendorId,
			categoryId: categoryId || undefined,
			slug: slug.trim(),
			title: title.trim(),
			description: description.trim() || undefined,
			imageUrls,
			tags,
			inventoryFromAllocations: containments.length > 0,
			breakFeeMode: advancedFeatureEnabled('breakFees') ? breakFeeMode : 'OFF',
			breakFeeCents: advancedFeatureEnabled('breakFees')
				? dollarsToCents(breakFeeDollars)
				: 0,
			attributeValueIds: selectedAttributeValueIds,
			scalarValues: attributeCatalog
				.filter((row) => row.valueKind && row.valueKind !== 'OPTION')
				.map((row) => ({
					attributeId: row.id,
					stringValue: row.valueKind === 'SCALAR_STRING' ? (scalarValues[row.id] || null) : null,
					numericValue: row.valueKind === 'SCALAR_NUMBER' ? (scalarValues[row.id] || null) : null,
					booleanValue: row.valueKind === 'SCALAR_BOOLEAN'
						? scalarValues[row.id] === 'true'
						: null,
				})),
			...measures,
			offerings,
			containments: containments.map((link) => ({
				parentOfferingKey: link.parentClientKey,
				childOfferingKey: link.childClientKey,
				childQtyPerParent: link.childQtyPerParent || '1',
				breakFeeCents: link.breakFeeCents
					? Number(link.breakFeeCents)
					: undefined,
			})),
		};
	};

	const validateForSubmit = (): string | null => {
		if(!vendorId) {
			return 'Choose a vendor.';
		}
		if(!title.trim() || !slug.trim()) {
			return 'Title and product URL are required.';
		}
		if(packOrPieceRows.length === 0) {
			return 'Add at least one piece.';
		}
		for(const row of packOrPieceRows) {
			if(!row.uomId) {
				return `Choose a UOM for ${row.label}.`;
			}
			if(row.price === '') {
				return `Enter a price for ${row.label}.`;
			}
		}
		for(const link of containments) {
			if(!link.childQtyPerParent || Number(link.childQtyPerParent) <= 0) {
				return 'Each pack link needs a positive quantity per parent.';
			}
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
			if(isCreating) {
				const product = await createCatalogProduct(buildCreatePayload());
				router.push(
					productViewHref({
						vendorSlug: product.vendor.slug,
						productSlug: product.slug,
					}),
				);
				return;
			}

			if(!resolvedProductId) {
				throw new Error('Missing product id for edit.');
			}

			const payload = buildCreatePayload();
			const offeringUpserts = packOrPieceRows.map((row) => ({
				...(row.id ? { id: row.id } : {}),
				clientKey: row.clientKey,
				offeringKey: row.clientKey,
				sku: row.sku.trim() || `${payload.slug.trim()}-${row.role.toLowerCase()}`,
				uomId: row.uomId,
				role: row.role,
				priceCents: dollarsToCents(row.price),
				qtyOnHand: row.qtyOnHand || '0',
				tracksOwnQty: !(
					row.role === 'PIECE'
					&& containments.some((link) => link.childClientKey === row.clientKey)
				),
				minUnbrokenQty:
					row.role === 'PACK' && row.breakable
						? row.minUnbrokenQty || '0'
						: '-1',
				breakPoolAboveQty: row.breakPoolAboveQty || '0',
				inheritQtyToChildren: Boolean(row.role === 'PACK' && row.breakable),
			}));

			const product = await updateCatalogProduct(resolvedProductId, {
				title: payload.title,
				slug: payload.slug,
				description: payload.description,
				imageUrls: payload.imageUrls,
				tags: payload.tags,
				categoryId: payload.categoryId ?? null,
				inventoryFromAllocations: payload.inventoryFromAllocations,
				breakFeeMode: payload.breakFeeMode,
				breakFeeCents: payload.breakFeeCents,
				attributeValueIds: payload.attributeValueIds,
				scalarValues: payload.scalarValues,
				...measures,
				offerings: offeringUpserts,
				containments: payload.containments,
			});
			setResolvedVendorSlug(product.vendor.slug);
			setResolvedProductSlug(product.slug);
			router.push(
				productViewHref({
					vendorSlug: product.vendor.slug,
					productSlug: product.slug,
				}),
			);
		}
		catch(submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Failed to save product.',
			);
		}
		finally {
			setSubmitting(false);
		}
	};

	if(loadingExisting) {
		return (
			<p className="text-sm text-slate-500">
				Loading product…
			</p>
		);
	}

	const pageTitle = isCreating
		? (isAdvancedSurface ? 'Advanced new product' : 'Create product')
		: (isAdvancedSurface ? 'Advanced edit product' : 'Edit product');

	const formIsDirty =
		title !== ''
		|| description !== ''
		|| slugTouched
		|| imageUrls.length > 0
		|| tags.length > 0
		|| selectedAttributeValueIds.length > 0
		|| packOrPieceRows.some((row) => row.price !== '' || row.sku !== '');

	const saveButtonClassName = `
		inline-flex
		h-10
		w-10
		shrink-0
		items-center
		justify-center
		gap-1.5
		rounded-full
		bg-sky
		text-sm
		font-semibold
		text-white
		hover:bg-sky/90
		disabled:opacity-60
		sm:h-auto
		sm:w-auto
		sm:px-5
		sm:py-2.5
	`;
	const saveButtonLabel = submitting
		? 'Saving…'
		: isCreating
			? 'Create product'
			: 'Save changes';
	const SaveGlyph = isCreating
		? PlusIcon
		: PencilIcon;

	return (
		<div
			className="
				mx-auto
				max-w-3xl
				space-y-6
				px-4
				py-10
				pb-[calc(6rem+var(--seller-bottom-pane-stack,0px))]
			"
		>
			<SellerTopContextPortal>
				{vendors.length > 1
					? (
						<label
							className="
								flex
								min-w-[12rem]
								max-w-full
								flex-1
								flex-col
								gap-1
								text-sm
								sm:max-w-sm
								sm:flex-none
							"
						>
							<span
								className="
									font-medium
									text-ink
								"
							>
								Vendor
							</span>
							<select
								aria-required={isCreating}
								className="
									w-full
									rounded-full
									border
									border-slate-300
									bg-white
									px-3
									py-1.5
									text-sm
									disabled:bg-slate-50
									disabled:text-slate-600
								"
								value={vendorId}
								disabled={!isCreating}
								onChange={(event) => setVendorId(event.target.value)}
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
					)
					: null
				}
				{vendors.length === 0
					? (
						<p
							className="
								text-xs
								text-slate-500
							"
						>
							No vendor memberships yet.
						</p>
					)
					: null
				}
			</SellerTopContextPortal>

			<header>
				<h1 className="text-3xl font-semibold text-ink">
					{pageTitle}
				</h1>
			</header>

			<form
				id="product-editor-form"
				className="space-y-6"
				onSubmit={onSubmit}
			>
				<p className="flex flex-wrap gap-3 text-sm">
					<a
						className="
							rounded
							font-semibold
							text-sky
							underline
							underline-offset-2
							focus:outline
							focus:outline-2
							focus:outline-offset-2
							focus:outline-sky
						"
						href="#product-price"
					>
						Skip to price
					</a>
					<a
						className="
							rounded
							font-semibold
							text-sky
							underline
							underline-offset-2
							focus:outline
							focus:outline-2
							focus:outline-offset-2
							focus:outline-sky
						"
						href="#product-save"
					>
						Skip to save
					</a>
				</p>

				<div
					className="
						space-y-8
						rounded-2xl
						border
						border-slate-200
						bg-white
						p-4
						sm:p-6
					"
				>
				<section className="space-y-4">
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
							{categoryTree.map((node) => (
								<option
									key={node.id}
									value={node.id}
								>
									{`${'— '.repeat(node.depth)}${node.name}`}
								</option>
							))}
						</select>
					</label>

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
							required
							onChange={(event) => {
								const next = event.target.value;
								setTitle(next);
								if(!slugTouched) {
									setSlug(slugify(next));
								}
							}}
						/>
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
							rows={4}
							value={description}
							onChange={(event) => setDescription(event.target.value)}
						/>
					</label>
				</section>

				<section
					className="
						space-y-4
						border-t
						border-slate-100
						pt-8
					"
				>
					{/* Default assumption: a single packless piece — no "Packs and pieces" title. */}
					{isAdvancedSurface || advancedFeatureEnabled('packsAndPieces')
						? (
								<div
									className="
										flex
										flex-wrap
										items-center
										justify-between
										gap-2
									"
								>
									<div className="space-y-1">
										<h2
											className="
												flex
												items-center
												gap-2
												text-lg
												font-semibold
												text-ink
											"
										>
											Packs and pieces
											<TermHint termId="pack" />
											<TermHint termId="piece" />
										</h2>
										<p className="text-xs text-slate-500">
											Each pack or piece row is a separately priced sellable option.
										</p>
									</div>
									<div className="flex flex-wrap items-center gap-2">
										{!isAdvancedSurface
											? (
													<DisclosurePrompt
														question=""
														onExpand={() => undefined}
														expanded
														onCollapse={collapsePackBreakdown}
														collapseLabel="Back to a single piece"
													/>
												)
											: null
										}
										<button
											type="button"
											className="
												rounded-full
												border
												border-slate-300
												px-3
												py-1.5
												text-xs
												font-semibold
											"
											onClick={() => addPackOrPiece('PACK')}
										>
											Add pack
										</button>
										<button
											type="button"
											className="
												rounded-full
												border
												border-slate-300
												px-3
												py-1.5
												text-xs
												font-semibold
											"
											onClick={() => addPackOrPiece('PIECE')}
										>
											Add piece
										</button>
									</div>
								</div>
							)
						: (
								<h2 className="text-lg font-semibold text-ink">
									What are you selling?
								</h2>
							)
					}

					{advancedFeatureEnabled('packsAndPieces')
						? (
								<div className="flex flex-wrap gap-2">
									{packOrPieceRows.map((row) => (
										<button
											key={row.clientKey}
											type="button"
											className={`
												rounded-full
												px-3
												py-1.5
												text-xs
												font-semibold
												${focusedClientKey === row.clientKey
											? 'bg-asgreen/15 text-asgreen'
											: 'border border-slate-300 text-slate-700'
										}
											`}
											onClick={() => setFocusedClientKey(row.clientKey)}
										>
											{row.role === 'PACK' ? 'Pack' : 'Piece'}
											{row.sku ? `: ${row.sku}` : ''}
										</button>
									))}
								</div>
							)
						: null
					}

					{focusedRow
						? (
								<div className="grid gap-3 sm:grid-cols-2">
									<label className="block text-sm">
										<span className="font-semibold">
											{pricePerLabel(focusedUom)}
										</span>
										<input
											id="product-price"
											className="
												mt-1
												w-full
												rounded-lg
												border
												border-slate-300
												px-3
												py-2
											"
											value={focusedRow.price}
											required
											onChange={(event) =>
												updateFocusedRow({ price: event.target.value })
											}
										/>
									</label>
									<div>
										<CompoundQtyField
											uomCode={focusedUom?.code}
											label="Qty on hand"
											value={focusedRow.qtyOnHand}
											onChange={(value) =>
												updateFocusedRow({ qtyOnHand: value })
											}
										/>
									</div>
									<label className="block text-sm sm:col-span-2">
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
											value={focusedRow.sku}
											onChange={(event) =>
												updateFocusedRow({ sku: event.target.value })
											}
										/>
									</label>
									<label className="block text-sm sm:col-span-2">
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
											value={focusedRow.uomId}
											required
											onChange={(event) =>
												updateFocusedRow({ uomId: event.target.value })
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
													{uom.code}
													{' · '}
													{uom.label}
												</option>
											))}
										</select>
									</label>

									{focusedRow.role === 'PACK'
										? (
												<div className="space-y-3 sm:col-span-2">
													{advancedFeatureEnabled('packBreakRules')
														? (
																<>
																	{!isAdvancedSurface
																		? (
																				<DisclosurePrompt
																					question=""
																					onExpand={() => undefined}
																					expanded
																					onCollapse={() =>
																						setAdvancedFeature('packBreakRules', false)
																					}
																					collapseLabel="Hide break rules"
																				/>
																			)
																		: null
																	}
																	<label
																		className="
																			flex
																			items-center
																			gap-2
																			text-sm
																		"
																	>
																		<input
																			type="checkbox"
																			checked={focusedRow.breakable}
																			onChange={(event) =>
																				updateFocusedRow({
																					breakable: event.target.checked,
																					inheritQtyToChildren: event.target.checked,
																				})
																			}
																		/>
																		Breakable pack (can supply child qty)
																	</label>
																	{focusedRow.breakable
																		? (
																				<div className="grid gap-3 sm:grid-cols-2">
																					<label className="block text-sm">
																						<span
																							className="
																								inline-flex
																								items-center
																								gap-2
																								font-semibold
																							"
																						>
																							Keep at least this many whole
																							<TermHint termId="broken-pack" />
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
																							value={focusedRow.minUnbrokenQty}
																							onChange={(event) =>
																								updateFocusedRow({
																									minUnbrokenQty: event.target.value,
																								})
																							}
																						/>
																					</label>
																					<label className="block text-sm">
																						<span
																							className="
																								inline-flex
																								items-center
																								gap-2
																								font-semibold
																							"
																						>
																							Open packs above this stock
																							<TermHint termId="broken-pack" />
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
																							value={focusedRow.breakPoolAboveQty}
																							onChange={(event) =>
																								updateFocusedRow({
																									breakPoolAboveQty: event.target.value,
																								})
																							}
																						/>
																					</label>
																				</div>
																			)
																		: null
																	}
																</>
															)
														: !isAdvancedSurface
															? (
																	<DisclosurePrompt
																		question={ADVANCED_FEATURE_PROMPTS.packBreakRules}
																		onExpand={() =>
																			setAdvancedFeature('packBreakRules', true)
																		}
																	/>
																)
															: null
													}
												</div>
											)
										: null
									}
								</div>
							)
						: null
					}

					{/* Pack breakdown lives where pack tools would appear. */}
					{!advancedFeatureEnabled('packsAndPieces') && !isAdvancedSurface
						? (
								<DisclosurePrompt
									question={ADVANCED_FEATURE_PROMPTS.packsAndPieces}
									onExpand={enablePackBreakdown}
								/>
							)
						: null
					}

					{advancedFeatureEnabled('packsAndPieces')
						? (
								<div className="space-y-3 border-t border-slate-100 pt-4">
									<div
										className="
											flex
											flex-wrap
											items-center
											justify-between
											gap-2
										"
									>
										<h3 className="text-sm font-semibold text-ink">
											How do packs relate?
										</h3>
										<button
											type="button"
											className="
												rounded-full
												border
												border-slate-300
												px-3
												py-1.5
												text-xs
												font-semibold
											"
											onClick={addContainmentLink}
										>
											Add pack link
										</button>
									</div>
									<p className="text-xs text-slate-500">
										Link a parent pack to a child pack or piece (including chained packs).
									</p>
									{containments.map((link, index) => (
										<div
											key={`${link.parentClientKey}-${link.childClientKey}-${index}`}
											className="grid gap-2 sm:grid-cols-3"
										>
											<label className="block text-xs">
												Parent pack
												<select
													className="
														mt-1
														w-full
														rounded-lg
														border
														border-slate-300
														px-2
														py-1.5
													"
													value={link.parentClientKey}
													onChange={(event) =>
														setContainments((prev) => prev.map((row, rowIndex) =>
															rowIndex === index
																? {
																		...row,
																		parentClientKey: event.target.value,
																	}
																: row,
														))
													}
												>
													{packOrPieceRows
														.filter((row) => row.role === 'PACK')
														.map((row) => (
															<option
																key={row.clientKey}
																value={row.clientKey}
															>
																{row.label || row.sku || row.clientKey}
															</option>
														))
													}
												</select>
											</label>
											<label className="block text-xs">
												Child pack or piece
												<select
													className="
														mt-1
														w-full
														rounded-lg
														border
														border-slate-300
														px-2
														py-1.5
													"
													value={link.childClientKey}
													onChange={(event) =>
														setContainments((prev) => prev.map((row, rowIndex) =>
															rowIndex === index
																? {
																		...row,
																		childClientKey: event.target.value,
																	}
																: row,
														))
													}
												>
													{packOrPieceRows.map((row) => (
														<option
															key={row.clientKey}
															value={row.clientKey}
														>
															{row.role}
															{' '}
															{row.label || row.sku || row.clientKey}
														</option>
													))}
												</select>
											</label>
											<label className="block text-xs">
												Qty per parent
												<input
													className="
														mt-1
														w-full
														rounded-lg
														border
														border-slate-300
														px-2
														py-1.5
													"
													value={link.childQtyPerParent}
													onChange={(event) =>
														setContainments((prev) => prev.map((row, rowIndex) =>
															rowIndex === index
																? {
																		...row,
																		childQtyPerParent: event.target.value,
																	}
																: row,
														))
													}
												/>
											</label>
										</div>
									))}

									{/* Break fee only matters once packs exist. */}
									{advancedFeatureEnabled('breakFees')
										? (
												<div className="space-y-3 border-t border-slate-100 pt-4">
													<div
														className="
															flex
															flex-wrap
															items-center
															justify-between
															gap-2
														"
													>
														<h3
															className="
																flex
																items-center
																gap-2
																text-sm
																font-semibold
																text-ink
															"
														>
															Break fees
															<TermHint termId="break-fee" />
														</h3>
														{!isAdvancedSurface
															? (
																	<DisclosurePrompt
																		question=""
																		onExpand={() => undefined}
																		expanded
																		onCollapse={() =>
																			setAdvancedFeature('breakFees', false)
																		}
																		collapseLabel="No break fee"
																	/>
																)
															: null
														}
													</div>
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
																Off
															</option>
															<option value="PER_PARENT_OPENED">
																Per parent opened
															</option>
															<option value="ONCE_PER_LINE">
																Once per line
															</option>
															<option value="PRODUCT_ONCE">
																Once per product
															</option>
														</select>
													</label>
													<label className="block text-sm">
														<span className="font-semibold">
															Fee ($)
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
															value={breakFeeDollars}
															onChange={(event) =>
																setBreakFeeDollars(event.target.value)
															}
														/>
													</label>
												</div>
											)
										: !isAdvancedSurface
											? (
													<DisclosurePrompt
														question={ADVANCED_FEATURE_PROMPTS.breakFees}
														onExpand={() => setAdvancedFeature('breakFees', true)}
													/>
												)
											: null
									}
								</div>
							)
						: null
					}
				</section>

				<section
					className="
						space-y-4
						border-t
						border-slate-100
						pt-8
					"
				>
					<CatalogImageField
						kind="product"
						value={imageUrls}
						onChange={setImageUrls}
						vendorId={vendorId || undefined}
						productId={existingProductId}
						disabled={!vendorId}
						disabledReason="Choose a vendor before uploading photos."
					/>

					<ProductTagField
						vendorId={vendorId}
						value={tags}
						onChange={setTags}
					/>
				</section>

				<section
					className="
						space-y-3
						border-t
						border-slate-100
						pt-8
					"
				>
					<h2 className="text-lg font-semibold text-ink">
						Attributes
					</h2>
					<p className="text-xs text-slate-500">
						Facts about this product such as color and material. Separately priced options use pack and piece rows above.
						Search to add; only selected values stay on the product.
					</p>
					<ProductAttributeField
						catalog={attributeCatalog.filter((row) => (row.valueKind ?? 'OPTION') === 'OPTION')}
						valueIds={selectedAttributeValueIds}
						onChange={setSelectedAttributeValueIds}
					/>
					{attributeCatalog.some((row) => row.valueKind && row.valueKind !== 'OPTION')
						? (
								<div className="space-y-2 pt-2">
									<p className="text-sm font-semibold text-slate-700">
										Other facts
									</p>
									{attributeCatalog
										.filter((row) => row.valueKind && row.valueKind !== 'OPTION')
										.map((attribute) => (
											<label
												key={attribute.id}
												className="block text-sm"
											>
												<span className="font-semibold">
													{attribute.name}
												</span>
												{attribute.valueKind === 'SCALAR_BOOLEAN'
													? (
															<select
																className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
																value={scalarValues[attribute.id] ?? ''}
																onChange={(event) =>
																	setScalarValues((prev) => ({
																		...prev,
																		[attribute.id]: event.target.value,
																	}))
																}
															>
																<option value="">
																	Not set
																</option>
																<option value="true">
																	Yes
																</option>
																<option value="false">
																	No
																</option>
															</select>
														)
													: (
															<input
																className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
																value={scalarValues[attribute.id] ?? ''}
																onChange={(event) =>
																	setScalarValues((prev) => ({
																		...prev,
																		[attribute.id]: event.target.value,
																	}))
																}
															/>
														)
												}
											</label>
										))
									}
								</div>
							)
						: null
					}
				</section>

				{advancedFeatureEnabled('measurements')
					? (
							<section
								className="
									space-y-3
									border-t
									border-slate-100
									pt-8
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
									<h2 className="text-lg font-semibold text-ink">
										Measurements
									</h2>
									{!isAdvancedSurface
										? (
												<DisclosurePrompt
													question=""
													onExpand={() => undefined}
													expanded
													onCollapse={() => setAdvancedFeature('measurements', false)}
													collapseLabel="Hide measurements"
												/>
											)
										: null
									}
								</div>
								<ProductMeasuresField
									value={measures}
									onChange={setMeasures}
								/>
							</section>
						)
					: (
							<DisclosurePrompt
								question={ADVANCED_FEATURE_PROMPTS.measurements}
								onExpand={() => setAdvancedFeature('measurements', true)}
							/>
						)
				}

				{error
					? (
							<p className="text-sm text-red-700">
								{error}
							</p>
						)
					: null
				}
				</div>

				<PageBottomPanePortal>
					{selectedVendor
						? (
							<span
								className="
									hidden
									max-w-[10rem]
									truncate
									text-xs
									text-slate-600
									sm:inline
								"
							>
								{selectedVendor.name}
							</span>
						)
						: null
					}
					<button
						id="product-save"
						type="submit"
						form="product-editor-form"
						disabled={submitting}
						aria-label={saveButtonLabel}
						className={saveButtonClassName}
					>
						<SaveGlyph
							className="
								h-4
								w-4
								shrink-0
							"
						/>
						<span
							className="
								hidden
								whitespace-nowrap
								sm:inline
							"
						>
							{saveButtonLabel}
						</span>
					</button>
				</PageBottomPanePortal>
			</form>

			<CatalogWorkspaceSwitcher
				active={productEditorSurface}
				intent={productEditorIntent}
				vendorRef={
					isCreating
						? (selectedVendor
							? vendorUrlRef(selectedVendor)
							: initialVendorId || null)
						: null
				}
				vendorSlug={
					isCreating
						? null
						: (resolvedVendorSlug || selectedVendor?.slug || null)
				}
				productSlug={
					isCreating
						? null
						: (resolvedProductSlug || slug || null)
				}
				categoryId={initialCategoryId || null}
				quiet={!isAdvancedSurface}
				confirmLeave={formIsDirty}
			/>
		</div>
	);
}
