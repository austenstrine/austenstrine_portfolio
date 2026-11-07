'use client';

import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
	type ReactNode,
} from 'react';
import {
	getCatalogProduct,
	updateCatalogProduct,
	uploadCatalogMedia,
	type CatalogCategoryRow,
	type CatalogProductDetail,
	type CatalogProductSummary,
	type UnitOfMeasure,
} from '../../lib/catalog-api';
import { centsToDollars, dollarsToCents } from '../../lib/catalog-product-form';
import { sortCategoryTree } from '../../lib/category-tree';
import {
	applyDetailToSummary,
	categoryIdForSlug,
	inPlaceQuietFieldClassName,
	loadInPlaceCategories,
	loadInPlaceUoms,
	uomIdForCode,
} from '../../lib/inplace-product-edit';
import { productEditHref } from '../../lib/vendor-ref';
import { PencilIcon } from '../icons/PencilIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import {
	type InPlaceEditTier,
	type InPlaceFieldName,
	useEditableVendors,
} from './EditableVendorsProvider';

export type InPlaceLookups = {
	categories: CatalogCategoryRow[];
	uoms: UnitOfMeasure[];
};

export type InPlaceProductEditState = {
	detail: CatalogProductDetail | null;
	lookups: InPlaceLookups | null;
	ready: boolean;
	saving: boolean;
	imageBusy: boolean;
	error: string | null;
	dirty: boolean;
	dirtyFields: ReadonlySet<InPlaceFieldName>;
	title: string;
	setTitle: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	categoryId: string;
	setCategoryId: (value: string) => void;
	price: string;
	setPrice: (value: string) => void;
	uomId: string;
	setUomId: (value: string) => void;
	qtyOnHand: string;
	setQtyOnHand: (value: string) => void;
	offeringId: string | null;
	/** Save every dirty field on this product (card / page registry). */
	saveAll: () => Promise<void>;
	/** Save one field (element tier). */
	saveField: (field: InPlaceFieldName) => Promise<void>;
	discard: () => void;
	discardField: (field: InPlaceFieldName) => void;
	replaceCoverImage: (file: File) => Promise<void>;
	addImage: (file: File) => Promise<void>;
	removeImageAt: (index: number) => void;
	setActiveOfferingId: (offeringId: string) => void;
};

type UseInPlaceProductEditOptions = {
	/** Summary or detail seed. Detail skips the fetch when id+slug match. */
	product: CatalogProductSummary | CatalogProductDetail;
	onUpdated?: (detail: CatalogProductDetail) => void;
	/** Prefer this offering for price/uom/qty when set. */
	offeringId?: string | null;
	/** Skip network work for buyers / deleted listings. */
	enabled?: boolean;
	/** Register with page-level save when enabled (default true). */
	registerWithPage?: boolean;
};

function isDetail(
	product: CatalogProductSummary | CatalogProductDetail,
): product is CatalogProductDetail {
	return Array.isArray((product as CatalogProductDetail).offerings)
		&& Boolean((product as CatalogProductDetail).permissions);
}

function computeDirtyFields(args: {
	detail: CatalogProductDetail | null;
	lookups: InPlaceLookups | null;
	title: string;
	description: string;
	categoryId: string;
	price: string;
	uomId: string;
	qtyOnHand: string;
	offeringId: string | null;
}): Set<InPlaceFieldName> {
	const dirty = new Set<InPlaceFieldName>();
	const { detail, lookups } = args;
	if(!detail) {
		return dirty;
	}
	if(args.title.trim() !== detail.title) {
		dirty.add('title');
	}
	if(args.description !== (detail.description ?? '')) {
		dirty.add('description');
	}
	const currentCategoryId = categoryIdForSlug(
		lookups?.categories ?? [],
		detail.category?.slug,
	);
	if(args.categoryId !== currentCategoryId) {
		dirty.add('category');
	}
	const offering = detail.offerings.find((row) => row.id === args.offeringId)
		?? detail.offerings[0]
		?? null;
	if(offering) {
		const cents = dollarsToCents(args.price);
		if(cents !== offering.priceCents) {
			dirty.add('price');
		}
		const currentUomId = uomIdForCode(lookups?.uoms ?? [], offering.uom.code);
		if(args.uomId && args.uomId !== currentUomId) {
			dirty.add('uom');
		}
		if((args.qtyOnHand || '0') !== (offering.qtyOnHand || '0')) {
			dirty.add('qty');
		}
	}
	return dirty;
}

export function useInPlaceProductEdit({
	product,
	onUpdated,
	offeringId,
	enabled = true,
	registerWithPage = true,
}: UseInPlaceProductEditOptions): InPlaceProductEditState {
	const {
		registerEditor,
		unregisterEditor,
	} = useEditableVendors();
	const [detail, setDetail] = useState<CatalogProductDetail | null>(
		() => (isDetail(product) ? product : null),
	);
	const [lookups, setLookups] = useState<InPlaceLookups | null>(null);
	const [saving, setSaving] = useState(false);
	const [imageBusy, setImageBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [title, setTitle] = useState(product.title);
	const [description, setDescription] = useState(product.description ?? '');
	const [categoryId, setCategoryId] = useState('');
	const [price, setPrice] = useState(
		product.primaryPriceCents != null
			? centsToDollars(product.primaryPriceCents)
			: '',
	);
	const [uomId, setUomId] = useState('');
	const [qtyOnHand, setQtyOnHand] = useState(product.availableQty);
	const [activeOfferingId, setActiveOfferingId] = useState<string | null>(
		offeringId ?? null,
	);
	const saveAllRef = useRef<() => Promise<void>>(async () => undefined);
	const discardRef = useRef<() => void>(() => undefined);

	useEffect(() => {
		if(offeringId) {
			setActiveOfferingId(offeringId);
		}
	}, [offeringId]);

	useEffect(() => {
		if(!enabled) {
			return;
		}
		let cancelled = false;
		const vendorId = product.vendor.id;
		if(!vendorId) {
			return;
		}

		const detailPromise = isDetail(product)
			? Promise.resolve(product)
			: getCatalogProduct(product.vendor.slug, product.slug);

		Promise.all([
			detailPromise,
			loadInPlaceCategories(),
			loadInPlaceUoms(vendorId),
		])
			.then(([nextDetail, categories, uoms]) => {
				if(cancelled) {
					return;
				}
				const preferredId = offeringId
					?? activeOfferingId
					?? nextDetail.offerings[0]?.id
					?? null;
				const offering = nextDetail.offerings.find(
					(row) => row.id === preferredId,
				) ?? nextDetail.offerings[0] ?? null;
				setDetail(nextDetail);
				setLookups({ categories, uoms });
				setTitle(nextDetail.title);
				setDescription(nextDetail.description ?? '');
				setCategoryId(
					categoryIdForSlug(categories, nextDetail.category?.slug),
				);
				setPrice(
					offering
						? centsToDollars(offering.priceCents)
						: '',
				);
				setUomId(uomIdForCode(uoms, offering?.uom.code));
				setQtyOnHand(offering?.qtyOnHand ?? nextDetail.availableQty);
				if(!activeOfferingId && offering?.id) {
					setActiveOfferingId(offering.id);
				}
			})
			.catch((loadError) => {
				if(!cancelled) {
					setError(
						loadError instanceof Error
							? loadError.message
							: 'Could not load listing.',
					);
				}
			});

		return () => {
			cancelled = true;
		};
		// Seed once per product identity; offering changes sync in a separate effect.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [enabled, product.id, product.slug, product.vendor.id, product.vendor.slug]);

	useEffect(() => {
		if(!detail || !lookups) {
			return;
		}
		const offering = detail.offerings.find(
			(row) => row.id === activeOfferingId,
		) ?? detail.offerings[0] ?? null;
		if(!offering) {
			return;
		}
		setPrice(centsToDollars(offering.priceCents));
		setUomId(uomIdForCode(lookups.uoms, offering.uom.code));
		setQtyOnHand(offering.qtyOnHand);
	}, [activeOfferingId, detail, lookups]);

	const offeringIdResolved = activeOfferingId
		?? detail?.offerings[0]?.id
		?? null;
	const ready = Boolean(detail && lookups);
	const dirtyFields = computeDirtyFields({
		detail,
		lookups,
		title,
		description,
		categoryId,
		price,
		uomId,
		qtyOnHand,
		offeringId: offeringIdResolved,
	});
	const dirty = dirtyFields.size > 0;

	const pushDetail = (next: CatalogProductDetail) => {
		setDetail(next);
		onUpdated?.(next);
		if(!lookups) {
			return;
		}
		const offering = next.offerings.find(
			(row) => row.id === offeringIdResolved,
		) ?? next.offerings[0] ?? null;
		setTitle(next.title);
		setDescription(next.description ?? '');
		setCategoryId(categoryIdForSlug(lookups.categories, next.category?.slug));
		setPrice(offering ? centsToDollars(offering.priceCents) : '');
		setUomId(uomIdForCode(lookups.uoms, offering?.uom.code));
		setQtyOnHand(offering?.qtyOnHand ?? next.availableQty);
	};

	const savePatch = async (
		payload: Parameters<typeof updateCatalogProduct>[1],
	) => {
		if(!detail || !ready || saving) {
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const updated = await updateCatalogProduct(detail.id, payload);
			pushDetail(updated);
		}
		catch(saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Save failed.',
			);
			throw saveError;
		}
		finally {
			setSaving(false);
		}
	};

	const buildPatchForFields = (fields: Iterable<InPlaceFieldName>) => {
		const wanted = new Set(fields);
		const payload: Parameters<typeof updateCatalogProduct>[1] = {};
		const offeringPatch: {
			id: string;
			priceCents?: number;
			uomId?: string;
			qtyOnHand?: string;
		} | null = offeringIdResolved
			? { id: offeringIdResolved }
			: null;

		if(wanted.has('title')) {
			const next = title.trim();
			if(next) {
				payload.title = next;
			}
		}
		if(wanted.has('description')) {
			payload.description = description;
		}
		if(wanted.has('category')) {
			payload.categoryId = categoryId || null;
		}
		if(offeringPatch) {
			if(wanted.has('price')) {
				offeringPatch.priceCents = dollarsToCents(price);
			}
			if(wanted.has('uom') && uomId) {
				offeringPatch.uomId = uomId;
			}
			if(wanted.has('qty')) {
				offeringPatch.qtyOnHand = qtyOnHand || '0';
			}
			if(
				offeringPatch.priceCents != null
				|| offeringPatch.uomId
				|| offeringPatch.qtyOnHand != null
			) {
				payload.offerings = [offeringPatch];
			}
		}
		return payload;
	};

	const saveAll = async () => {
		if(!dirty || !detail) {
			return;
		}
		const payload = buildPatchForFields(dirtyFields);
		if(Object.keys(payload).length === 0) {
			return;
		}
		await savePatch(payload);
	};

	const saveField = async (field: InPlaceFieldName) => {
		if(field === 'images' || !dirtyFields.has(field)) {
			return;
		}
		const payload = buildPatchForFields([field]);
		if(Object.keys(payload).length === 0) {
			return;
		}
		await savePatch(payload);
	};

	const discard = () => {
		if(!detail) {
			setTitle(product.title);
			setDescription(product.description ?? '');
			setPrice(
				product.primaryPriceCents != null
					? centsToDollars(product.primaryPriceCents)
					: '',
			);
			setQtyOnHand(product.availableQty);
			setError(null);
			return;
		}
		if(!lookups) {
			return;
		}
		const offering = detail.offerings.find(
			(row) => row.id === offeringIdResolved,
		) ?? detail.offerings[0] ?? null;
		setTitle(detail.title);
		setDescription(detail.description ?? '');
		setCategoryId(categoryIdForSlug(lookups.categories, detail.category?.slug));
		setPrice(offering ? centsToDollars(offering.priceCents) : '');
		setUomId(uomIdForCode(lookups.uoms, offering?.uom.code));
		setQtyOnHand(offering?.qtyOnHand ?? detail.availableQty);
		setError(null);
	};

	const discardField = (field: InPlaceFieldName) => {
		if(!detail) {
			discard();
			return;
		}
		const offering = detail.offerings.find(
			(row) => row.id === offeringIdResolved,
		) ?? detail.offerings[0] ?? null;
		if(field === 'title') {
			setTitle(detail.title);
		}
		else if(field === 'description') {
			setDescription(detail.description ?? '');
		}
		else if(field === 'category') {
			setCategoryId(
				categoryIdForSlug(lookups?.categories ?? [], detail.category?.slug),
			);
		}
		else if(field === 'price') {
			setPrice(offering ? centsToDollars(offering.priceCents) : '');
		}
		else if(field === 'uom') {
			setUomId(uomIdForCode(lookups?.uoms ?? [], offering?.uom.code));
		}
		else if(field === 'qty') {
			setQtyOnHand(offering?.qtyOnHand ?? detail.availableQty);
		}
		setError(null);
	};

	saveAllRef.current = saveAll;
	discardRef.current = discard;

	useEffect(() => {
		if(!enabled || !registerWithPage) {
			unregisterEditor(product.id);
			return;
		}
		registerEditor({
			productId: product.id,
			dirty,
			save: () => saveAllRef.current(),
			discard: () => discardRef.current(),
		});
		return () => {
			unregisterEditor(product.id);
		};
	}, [
		dirty,
		enabled,
		product.id,
		registerEditor,
		registerWithPage,
		unregisterEditor,
	]);

	const writeImages = async (nextUrls: string[]) => {
		if(!detail) {
			return;
		}
		setImageBusy(true);
		setError(null);
		try {
			const updated = await updateCatalogProduct(detail.id, {
				imageUrls: nextUrls,
			});
			pushDetail(updated);
		}
		catch(saveError) {
			setError(
				saveError instanceof Error
					? saveError.message
					: 'Could not update image.',
			);
		}
		finally {
			setImageBusy(false);
		}
	};

	const uploadThen = async (
		file: File,
		merge: (current: string[], uploadedPath: string) => string[],
	) => {
		if(!detail) {
			return;
		}
		setImageBusy(true);
		setError(null);
		try {
			const stored = await uploadCatalogMedia({
				file,
				kind: 'product',
				productId: detail.id,
				vendorId: detail.vendor.id,
			});
			const current = detail.imageUrls ?? [];
			await writeImages(merge(current, stored.path).slice(0, 8));
		}
		catch(uploadError) {
			setError(
				uploadError instanceof Error
					? uploadError.message
					: 'Could not update image.',
			);
			setImageBusy(false);
		}
	};

	const replaceCoverImage = async (file: File) => {
		await uploadThen(file, (current, path) => [path, ...current.slice(1)]);
	};

	const addImage = async (file: File) => {
		await uploadThen(file, (current, path) =>
			current.length === 0
				? [path]
				: [...current, path]);
	};

	const removeImageAt = (index: number) => {
		const current = detail?.imageUrls ?? [];
		if(!current[index]) {
			return;
		}
		void writeImages(current.filter((_, itemIndex) => itemIndex !== index));
	};

	return {
		detail,
		lookups,
		ready,
		saving,
		imageBusy,
		error,
		dirty,
		dirtyFields,
		title,
		setTitle,
		description,
		setDescription,
		categoryId,
		setCategoryId,
		price,
		setPrice,
		uomId,
		setUomId,
		qtyOnHand,
		setQtyOnHand,
		offeringId: offeringIdResolved,
		saveAll,
		saveField,
		discard,
		discardField,
		replaceCoverImage,
		addImage,
		removeImageAt,
		setActiveOfferingId,
	};
}

function onEnterBlur(
	event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
) {
	if(event.key === 'Enter' && event.currentTarget.tagName !== 'TEXTAREA') {
		event.preventDefault();
		event.currentTarget.blur();
	}
}

function stop(event: { preventDefault: () => void; stopPropagation: () => void }) {
	event.preventDefault();
	event.stopPropagation();
}

export function InPlaceCategorySelect({
	edit,
	className = '',
	'aria-label': ariaLabel = 'Category',
}: {
	edit: InPlaceProductEditState;
	className?: string;
	'aria-label'?: string;
}) {
	const tree = edit.lookups
		? sortCategoryTree(edit.lookups.categories)
		: [];
	return (
		<select
			aria-label={ariaLabel}
			className={`
				${inPlaceQuietFieldClassName}
				${className}
			`}
			disabled={!edit.ready || edit.saving}
			onChange={(event) => {
				edit.setCategoryId(event.target.value);
			}}
			onClick={stop}
			value={edit.categoryId}
		>
			<option value="">
				Uncategorized
			</option>
			{tree.map((node) => (
				<option
					key={node.id}
					value={node.id}
				>
					{`${'— '.repeat(node.depth)}${node.name}`}
				</option>
			))}
		</select>
	);
}

export function InPlaceTitleInput({
	edit,
	className = '',
	id,
}: {
	edit: InPlaceProductEditState;
	className?: string;
	id?: string;
}) {
	return (
		<input
			aria-label="Title"
			className={`
				${inPlaceQuietFieldClassName}
				${className}
			`}
			disabled={!edit.ready || edit.saving}
			id={id}
			onChange={(event) => edit.setTitle(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				if(event.key === 'Escape') {
					event.preventDefault();
					edit.setTitle(edit.detail?.title ?? edit.title);
					event.currentTarget.blur();
					return;
				}
				onEnterBlur(event);
			}}
			value={edit.title}
		/>
	);
}

export function InPlaceDescriptionInput({
	edit,
	className = '',
	rows = 3,
}: {
	edit: InPlaceProductEditState;
	className?: string;
	rows?: number;
}) {
	return (
		<textarea
			aria-label="Description"
			className={`
				${inPlaceQuietFieldClassName}
				resize-y
				${className}
			`}
			disabled={!edit.ready || edit.saving}
			onChange={(event) => edit.setDescription(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				if(event.key === 'Escape') {
					event.preventDefault();
					edit.setDescription(edit.detail?.description ?? '');
					event.currentTarget.blur();
				}
			}}
			rows={rows}
			value={edit.description}
		/>
	);
}

export function InPlacePriceInput({
	edit,
	className = '',
}: {
	edit: InPlaceProductEditState;
	className?: string;
}) {
	return (
		<input
			aria-label="Price"
			className={`
				${inPlaceQuietFieldClassName}
				${className}
			`}
			disabled={!edit.ready || edit.saving || !edit.offeringId}
			inputMode="decimal"
			onChange={(event) => edit.setPrice(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				if(event.key === 'Escape') {
					event.preventDefault();
					const current = edit.detail?.offerings.find(
						(row) => row.id === edit.offeringId,
					)?.priceCents;
					edit.setPrice(
						current != null
							? centsToDollars(current)
							: '',
					);
					event.currentTarget.blur();
					return;
				}
				onEnterBlur(event);
			}}
			value={edit.price}
		/>
	);
}

export function InPlaceUomSelect({
	edit,
	className = '',
}: {
	edit: InPlaceProductEditState;
	className?: string;
}) {
	const uoms = edit.lookups?.uoms ?? [];
	if(uoms.length === 0) {
		const code = edit.detail?.offerings.find(
			(row) => row.id === edit.offeringId,
		)?.uom.code;
		if(!code) {
			return null;
		}
		return (
			<span className={className}>
				/ {code}
			</span>
		);
	}
	return (
		<select
			aria-label="Unit"
			className={`
				${inPlaceQuietFieldClassName}
				${className}
			`}
			disabled={!edit.ready || edit.saving || !edit.offeringId}
			onChange={(event) => {
				edit.setUomId(event.target.value);
			}}
			onClick={stop}
			value={edit.uomId}
		>
			{uoms.map((row) => (
				<option
					key={row.id}
					value={row.id}
				>
					/ {row.code}
				</option>
			))}
		</select>
	);
}

export function InPlaceQtyInput({
	edit,
	className = '',
}: {
	edit: InPlaceProductEditState;
	className?: string;
}) {
	return (
		<input
			aria-label="Quantity on hand"
			className={`
				${inPlaceQuietFieldClassName}
				${className}
			`}
			disabled={!edit.ready || edit.saving || !edit.offeringId}
			inputMode="decimal"
			onChange={(event) => edit.setQtyOnHand(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				if(event.key === 'Escape') {
					event.preventDefault();
					const current = edit.detail?.offerings.find(
						(row) => row.id === edit.offeringId,
					)?.qtyOnHand;
					edit.setQtyOnHand(current ?? edit.qtyOnHand);
					event.currentTarget.blur();
					return;
				}
				onEnterBlur(event);
			}}
			value={edit.qtyOnHand}
		/>
	);
}

export function InPlaceImageActions({
	edit,
	coverIndex = 0,
}: {
	edit: InPlaceProductEditState;
	coverIndex?: number;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const modeRef = useRef<'replace' | 'add'>('add');
	const images = edit.detail?.imageUrls ?? [];

	return (
		<>
			<input
				accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
				className="hidden"
				onChange={(event) => {
					const file = event.target.files?.[0];
					if(!file) {
						return;
					}
					void (
						modeRef.current === 'replace'
							? edit.replaceCoverImage(file)
							: edit.addImage(file)
					);
					if(inputRef.current) {
						inputRef.current.value = '';
					}
				}}
				ref={inputRef}
				type="file"
			/>
			<div
				className="
					absolute
					right-3
					top-3
					z-30
					flex
					gap-1
				"
			>
				{images.length > 0
					? (
						<button
							aria-label="Remove image"
							className="
								inline-flex
								h-9
								w-9
								items-center
								justify-center
								rounded-full
								border
								border-slate-300
								bg-white/95
								text-ink
								hover:border-sky
								hover:text-sky
								disabled:opacity-50
							"
							disabled={edit.saving || edit.imageBusy}
							onClick={(event) => {
								event.preventDefault();
								event.stopPropagation();
								edit.removeImageAt(coverIndex);
							}}
							type="button"
						>
							<TrashIcon className="h-3.5 w-3.5" />
						</button>
					)
					: null
				}
				<button
					aria-label={
						images.length > 0
							? 'Add image'
							: 'Upload image'
					}
					className="
						inline-flex
						h-9
						w-9
						items-center
						justify-center
						rounded-full
						border
						border-slate-300
						bg-white/95
						text-ink
						hover:border-sky
						hover:text-sky
						disabled:opacity-50
					"
					disabled={
						edit.saving
						|| edit.imageBusy
						|| images.length >= 8
					}
					onClick={(event) => {
						event.preventDefault();
						event.stopPropagation();
						modeRef.current = images.length === 0
							? 'replace'
							: 'add';
						inputRef.current?.click();
					}}
					type="button"
				>
					<PlusIcon className="h-3.5 w-3.5" />
				</button>
			</div>
			<button
				aria-label={
					images.length > 0
						? 'Replace cover image'
						: 'Upload image'
				}
				className="
					absolute
					inset-0
					z-10
					cursor-pointer
					bg-transparent
				"
				disabled={edit.saving || edit.imageBusy}
				onClick={(event) => {
					event.preventDefault();
					event.stopPropagation();
					modeRef.current = 'replace';
					inputRef.current?.click();
				}}
				type="button"
			/>
		</>
	);
}

export function InPlaceFullEditLink({
	product,
	className = '',
}: {
	product: Pick<CatalogProductSummary, 'slug' | 'vendor'>;
	className?: string;
}) {
	return (
		<a
			className={`
				inline-flex
				items-center
				gap-1.5
				text-xs
				font-semibold
				text-sky
				hover:underline
				${className}
			`}
			href={productEditHref({
				vendorSlug: product.vendor.slug,
				productSlug: product.slug,
			})}
		>
			<PencilIcon className="h-3.5 w-3.5 shrink-0" />
			Full edit
		</a>
	);
}

const TIER_OPTIONS: Array<{
	tier: Exclude<InPlaceEditTier, 'off'>;
	label: string;
	hint: string;
}> = [
	{ tier: 'page', label: 'Page', hint: 'All fields on this page' },
	{ tier: 'card', label: 'Card', hint: 'One product card at a time' },
	{ tier: 'element', label: 'Field', hint: 'One field at a time' },
];

/** Opt into tiered in-place edits (off by default). */
export function InPlaceEditToggle({
	tier,
	onChange,
	className = '',
}: {
	tier: InPlaceEditTier;
	onChange: (tier: InPlaceEditTier) => void;
	className?: string;
}) {
	const [open, setOpen] = useState(false);
	const active = tier !== 'off';
	const activeLabel = TIER_OPTIONS.find((row) => row.tier === tier)?.label;

	return (
		<div
			className={`
				relative
				inline-flex
				${className}
			`}
		>
			<button
				aria-expanded={open}
				aria-haspopup="menu"
				aria-pressed={active}
				className={
					`
						inline-flex
						items-center
						gap-1.5
						rounded-full
						border
						px-3
						py-1.5
						text-xs
						font-semibold
						transition
						${active
							? 'border-asgreen/40 bg-asgreen/10 text-asgreen'
							: 'border-slate-300 bg-white text-ink hover:border-sky hover:text-sky'
						}
					`
				}
				onClick={() => setOpen((value) => !value)}
				type="button"
			>
				<PencilIcon className="h-3.5 w-3.5 shrink-0" />
				{active
					? `Edit · ${activeLabel}`
					: 'Edit'
				}
			</button>
			{open
				? (
					<div
						className="
							absolute
							right-0
							top-full
							z-40
							mt-1.5
							min-w-[12.5rem]
							rounded-xl
							border
							border-slate-200
							bg-white
							p-1.5
							shadow-[0_12px_28px_rgba(13,27,42,0.12)]
						"
						role="menu"
					>
						{TIER_OPTIONS.map((option) => (
							<button
								aria-checked={tier === option.tier}
								className={
									`
										flex
										w-full
										flex-col
										items-start
										rounded-lg
										px-2.5
										py-2
										text-left
										${tier === option.tier
											? 'bg-asgreen/10 text-asgreen'
											: 'text-ink hover:bg-frost'
										}
									`
								}
								key={option.tier}
								onClick={() => {
									onChange(option.tier);
									setOpen(false);
								}}
								role="menuitemradio"
								type="button"
							>
								<span className="text-xs font-semibold">
									{option.label}
								</span>
								<span className="text-[11px] font-medium text-slate-500">
									{option.hint}
								</span>
							</button>
						))}
						<button
							className="
								mt-0.5
								flex
								w-full
								items-center
								rounded-lg
								px-2.5
								py-2
								text-left
								text-xs
								font-semibold
								text-slate-600
								hover:bg-frost
							"
							onClick={() => {
								onChange('off');
								setOpen(false);
							}}
							role="menuitem"
							type="button"
						>
							Done
						</button>
					</div>
				)
				: null
			}
		</div>
	);
}

export function InPlaceSaveControls({
	scope,
	dirty,
	saving,
	onSave,
	onDiscard,
	className = '',
}: {
	scope: 'page' | 'card' | 'field';
	dirty: boolean;
	saving: boolean;
	onSave: () => void;
	onDiscard: () => void;
	className?: string;
}) {
	if(!dirty && !saving) {
		return null;
	}
	const label = scope === 'page'
		? 'Save page'
		: scope === 'card'
			? 'Save card'
			: 'Save field';
	return (
		<div
			className={`
				flex
				flex-wrap
				items-center
				gap-2
				${className}
			`}
		>
			<button
				className="
					inline-flex
					items-center
					rounded-full
					bg-asgreen
					px-3
					py-1.5
					text-xs
					font-semibold
					text-white
					hover:bg-asgreen/90
					disabled:opacity-50
				"
				disabled={!dirty || saving}
				onClick={onSave}
				type="button"
			>
				{saving
					? 'Saving…'
					: label
				}
			</button>
			<button
				className="
					inline-flex
					items-center
					rounded-full
					border
					border-slate-300
					bg-white
					px-3
					py-1.5
					text-xs
					font-semibold
					text-ink
					hover:border-sky
					hover:text-sky
					disabled:opacity-50
				"
				disabled={saving || !dirty}
				onClick={onDiscard}
				type="button"
			>
				Discard
			</button>
		</div>
	);
}

export function InPlacePageSaveBar() {
	const {
		editTier,
		pageDirty,
		savingPage,
		savePage,
		discardPage,
	} = useEditableVendors();
	if(editTier !== 'page' || (!pageDirty && !savingPage)) {
		return null;
	}
	return (
		<div
			className="
				pointer-events-none
				fixed
				inset-x-0
				bottom-0
				z-40
				flex
				justify-center
				px-gutter
				pb-4
			"
		>
			<div
				className="
					pointer-events-auto
					flex
					flex-wrap
					items-center
					gap-3
					rounded-2xl
					border
					border-slate-200
					bg-white/95
					px-4
					py-3
					shadow-[0_12px_32px_rgba(13,27,42,0.14)]
					backdrop-blur
				"
			>
				<p className="text-xs font-semibold text-ink">
					Unsaved edits on this page
				</p>
				<InPlaceSaveControls
					dirty={pageDirty}
					onDiscard={discardPage}
					onSave={() => {
						void savePage();
					}}
					saving={savingPage}
					scope="page"
				/>
			</div>
		</div>
	);
}

export function InPlaceFieldSaveButton({
	edit,
	field,
	className = '',
}: {
	edit: InPlaceProductEditState;
	field: InPlaceFieldName;
	className?: string;
}) {
	const dirty = edit.dirtyFields.has(field);
	if(!dirty) {
		return null;
	}
	return (
		<InPlaceSaveControls
			className={className}
			dirty={dirty}
			onDiscard={() => {
				edit.discardField(field);
			}}
			onSave={() => {
				void edit.saveField(field);
			}}
			saving={edit.saving}
			scope="field"
		/>
	);
}

export function InPlaceActivateHint({
	children,
	onActivate,
	label,
}: {
	children: ReactNode;
	onActivate: () => void;
	label: string;
}) {
	return (
		<button
			aria-label={label}
			className="
				block
				w-full
				rounded-sm
				border
				border-transparent
				bg-transparent
				p-0
				text-left
				hover:border-dashed
				hover:border-slate-300
			"
			onClick={(event) => {
				event.preventDefault();
				event.stopPropagation();
				onActivate();
			}}
			type="button"
		>
			{children}
		</button>
	);
}

export function InPlaceError({
	error,
	className = '',
}: {
	error: string | null;
	className?: string;
}) {
	if(!error) {
		return null;
	}
	return (
		<p
			className={`
				text-[12px]
				text-red-700
				${className}
			`}
		>
			{error}
		</p>
	);
}

export { applyDetailToSummary };
