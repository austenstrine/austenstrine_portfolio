'use client';

import {
	useEffect,
	useRef,
	useState,
	type KeyboardEvent,
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
	title: string;
	setTitle: (value: string) => void;
	description: string;
	setDescription: (value: string) => void;
	categoryId: string;
	price: string;
	setPrice: (value: string) => void;
	uomId: string;
	qtyOnHand: string;
	setQtyOnHand: (value: string) => void;
	offeringId: string | null;
	saveTitle: () => void;
	saveDescription: () => void;
	saveCategory: (nextId: string) => void;
	savePrice: () => void;
	saveUom: (nextId: string) => void;
	saveQty: () => void;
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
};

function isDetail(
	product: CatalogProductSummary | CatalogProductDetail,
): product is CatalogProductDetail {
	return Array.isArray((product as CatalogProductDetail).offerings)
		&& Boolean((product as CatalogProductDetail).permissions);
}

export function useInPlaceProductEdit({
	product,
	onUpdated,
	offeringId,
	enabled = true,
}: UseInPlaceProductEditOptions): InPlaceProductEditState {
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
		}
		finally {
			setSaving(false);
		}
	};

	const saveTitle = () => {
		const next = title.trim();
		if(!next || next === detail?.title) {
			setTitle(detail?.title ?? product.title);
			return;
		}
		void savePatch({ title: next });
	};

	const saveDescription = () => {
		const next = description;
		if(next === (detail?.description ?? '')) {
			return;
		}
		void savePatch({ description: next });
	};

	const saveCategory = (nextId: string) => {
		setCategoryId(nextId);
		const currentId = categoryIdForSlug(
			lookups?.categories ?? [],
			detail?.category?.slug,
		);
		if(nextId === currentId) {
			return;
		}
		void savePatch({ categoryId: nextId || null });
	};

	const savePrice = () => {
		if(!offeringIdResolved) {
			return;
		}
		const cents = dollarsToCents(price);
		const current = detail?.offerings.find(
			(row) => row.id === offeringIdResolved,
		)?.priceCents;
		if(current != null && cents === current) {
			setPrice(centsToDollars(current));
			return;
		}
		void savePatch({
			offerings: [{ id: offeringIdResolved, priceCents: cents }],
		});
	};

	const saveUom = (nextId: string) => {
		if(!offeringIdResolved) {
			return;
		}
		setUomId(nextId);
		const currentCode = detail?.offerings.find(
			(row) => row.id === offeringIdResolved,
		)?.uom.code;
		const nextCode = lookups?.uoms.find((row) => row.id === nextId)?.code;
		if(!nextId || !nextCode || nextCode === currentCode) {
			return;
		}
		void savePatch({
			offerings: [{ id: offeringIdResolved, uomId: nextId }],
		});
	};

	const saveQty = () => {
		if(!offeringIdResolved) {
			return;
		}
		const current = detail?.offerings.find(
			(row) => row.id === offeringIdResolved,
		)?.qtyOnHand;
		if((qtyOnHand || '0') === (current || '0')) {
			return;
		}
		void savePatch({
			offerings: [{ id: offeringIdResolved, qtyOnHand: qtyOnHand || '0' }],
		});
	};

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
		title,
		setTitle,
		description,
		setDescription,
		categoryId,
		price,
		setPrice,
		uomId,
		qtyOnHand,
		setQtyOnHand,
		offeringId: offeringIdResolved,
		saveTitle,
		saveDescription,
		saveCategory,
		savePrice,
		saveUom,
		saveQty,
		replaceCoverImage,
		addImage,
		removeImageAt,
		setActiveOfferingId,
	};
}

function onCommitKey(
	event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
	onCommit: () => void,
	onCancel: () => void,
) {
	if(event.key === 'Enter' && event.currentTarget.tagName !== 'TEXTAREA') {
		event.preventDefault();
		event.currentTarget.blur();
		onCommit();
	}
	else if(event.key === 'Escape') {
		event.preventDefault();
		onCancel();
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
				edit.saveCategory(event.target.value);
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
			onBlur={edit.saveTitle}
			onChange={(event) => edit.setTitle(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				onCommitKey(
					event,
					edit.saveTitle,
					() => edit.setTitle(edit.detail?.title ?? edit.title),
				);
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
			onBlur={edit.saveDescription}
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
			onBlur={edit.savePrice}
			onChange={(event) => edit.setPrice(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				onCommitKey(
					event,
					edit.savePrice,
					() => {
						const current = edit.detail?.offerings.find(
							(row) => row.id === edit.offeringId,
						)?.priceCents;
						edit.setPrice(
							current != null
								? centsToDollars(current)
								: '',
						);
					},
				);
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
				edit.saveUom(event.target.value);
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
			onBlur={edit.saveQty}
			onChange={(event) => edit.setQtyOnHand(event.target.value)}
			onClick={stop}
			onKeyDown={(event) => {
				onCommitKey(
					event,
					edit.saveQty,
					() => {
						const current = edit.detail?.offerings.find(
							(row) => row.id === edit.offeringId,
						)?.qtyOnHand;
						edit.setQtyOnHand(current ?? edit.qtyOnHand);
					},
				);
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
