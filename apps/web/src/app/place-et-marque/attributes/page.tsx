'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { SellerTopContextPortal } from '../../../components/catalog/CatalogSearchContext';
import {
	createCatalogAttribute,
	createGlobalAttributeValue,
	listCatalogAttributes,
	listCatalogCategories,
	listMyVendors,
	upsertVendorAttributeValue,
	type CatalogAttributeDefinition,
	type VendorSummary,
} from '../../../lib/catalog-api';
import { sortCategoryTree } from '../../../lib/category-tree';
import { useSession } from '../../../lib/useSession';

const fieldClassName = `
	mt-1
	w-full
	rounded-lg
	border
	border-slate-300
	px-3
	py-2
	text-sm
`;

function valueKindLabel(kind: CatalogAttributeDefinition['valueKind']) {
	switch(kind) {
		case 'SCALAR_STRING':
			return 'Text';
		case 'SCALAR_NUMBER':
			return 'Number';
		case 'SCALAR_BOOLEAN':
			return 'Yes / no';
		case 'OPTION':
		default:
			return 'Options';
	}
}

function AttributeRow({
	attribute,
	values,
}: {
	attribute: CatalogAttributeDefinition;
	values: CatalogAttributeDefinition['values'];
}) {
	return (
		<li
			className="
				flex
				flex-col
				gap-0.5
				px-1
				py-3
			"
		>
			<p className="font-semibold text-ink">
				{attribute.name}
				<span className="ml-2 text-xs font-medium text-slate-500">
					{valueKindLabel(attribute.valueKind)}
				</span>
			</p>
			{values.length > 0
				? (
						<p className="text-sm text-slate-600">
							{values.map((value) => value.value).join(', ')}
						</p>
					)
				: null
			}
		</li>
	);
}

function AttributesPageContent() {
	const { user } = useSession();
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [vendorId, setVendorId] = useState('');
	const [attributes, setAttributes] = useState<CatalogAttributeDefinition[]>([]);
	const [categories, setCategories] = useState<Array<{
		id: string;
		slug: string;
		name: string;
		parent?: { id: string; name: string; slug: string } | null;
	}>>([]);
	const [name, setName] = useState('');
	const [asGlobal, setAsGlobal] = useState(false);
	const [valueKind, setValueKind] = useState<'OPTION' | 'SCALAR_STRING' | 'SCALAR_NUMBER' | 'SCALAR_BOOLEAN'>('OPTION');
	const [valueAttributeId, setValueAttributeId] = useState('');
	const [valueText, setValueText] = useState('');
	const [parentId, setParentId] = useState('');
	const [categoryIds, setCategoryIds] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const isSuperVendor = vendors.some(
		(vendor) =>
			vendor.isSuperVendor
			&& (vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR'),
	);
	const categoryTree = sortCategoryTree(categories);

	const refresh = useCallback(async () => {
		const vendorRows = await listMyVendors();
		setVendors(vendorRows);
		const selected =
			vendorId && vendorRows.some((row) => row.id === vendorId)
				? vendorId
				: vendorRows[0]?.id ?? '';
		if(selected !== vendorId) {
			setVendorId(selected);
		}
		setAttributes(await listCatalogAttributes(selected || undefined));
		setCategories(await listCatalogCategories());
	}, [vendorId]);

	useEffect(() => {
		void refresh().catch(() => undefined);
	}, [refresh]);

	const globals = useMemo(
		() => attributes.filter((row) => !row.vendorId),
		[attributes],
	);
	const mine = useMemo(
		() => attributes.filter((row) => row.vendorId === vendorId),
		[attributes, vendorId],
	);
	const selectedAttribute = attributes.find((row) => row.id === valueAttributeId);
	const globalParents = selectedAttribute?.values.filter((row) => !row.vendorId) ?? [];
	const vendorScopedGlobals = useMemo(
		() =>
			globals
				.map((attribute) => ({
					attribute,
					values: attribute.values.filter((row) => row.vendorId === vendorId),
				}))
				.filter((row) => row.values.length > 0),
		[globals, vendorId],
	);

	const onCreateAttribute = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);
		try {
			await createCatalogAttribute({
				name: name.trim(),
				vendorId: asGlobal && isSuperVendor ? undefined : vendorId,
				asGlobal: asGlobal && isSuperVendor,
				valueKind,
			});
			setName('');
			setAsGlobal(false);
			setValueKind('OPTION');
			setAttributes(await listCatalogAttributes(vendorId || undefined));
		}
		catch(submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not create attribute.');
		}
		finally {
			setSubmitting(false);
		}
	};

	const onCreateValue = async (event: FormEvent) => {
		event.preventDefault();
		if(!valueAttributeId || !valueText.trim()) {
			return;
		}
		setError(null);
		setSubmitting(true);
		try {
			const attribute = attributes.find((row) => row.id === valueAttributeId);
			if(attribute && !attribute.vendorId && isSuperVendor && !parentId && categoryIds.length === 0) {
				await createGlobalAttributeValue({
					attributeId: valueAttributeId,
					value: valueText.trim(),
				});
			}
			else {
				await upsertVendorAttributeValue({
					vendorId,
					attributeId: valueAttributeId,
					value: valueText.trim(),
					parentId: parentId || undefined,
					categoryIds,
				});
			}
			setValueText('');
			setParentId('');
			setCategoryIds([]);
			setAttributes(await listCatalogAttributes(vendorId || undefined));
		}
		catch(submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not save value.');
		}
		finally {
			setSubmitting(false);
		}
	};

	return (
		<div
			className="
				flex
				flex-col
				gap-8
			"
		>
			<SellerTopContextPortal>
				{vendors.length > 0
					? (
							<label
								className="
									flex
									min-w-[12rem]
									max-w-full
									flex-1
									flex-col
									gap-0.5
									sm:max-w-sm
									sm:flex-none
								"
							>
								<span
									className="
										text-[11px]
										font-medium
										leading-tight
										text-slate-500
									"
								>
									Vendor:
								</span>
								<select
									className="
										w-full
										rounded-full
										border
										border-slate-300
										bg-white
										px-3
										py-1.5
										text-sm
									"
									value={vendorId}
									onChange={(event) => setVendorId(event.target.value)}
								>
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
			</SellerTopContextPortal>

			<div
				className="
					flex
					flex-wrap
					items-center
					justify-between
					gap-3
				"
			>
				<h1
					className="
						text-2xl
						font-semibold
						tracking-tight
						text-ink
					"
				>
					Attributes
				</h1>
				{user && attributes.length > 0
					? (
							<p className="text-sm text-slate-500">
								{attributes.length}
								{' '}
								attribute
								{attributes.length === 1 ? '' : 's'}
							</p>
						)
					: null
				}
			</div>

			<form
				className="
					grid
					gap-3
					sm:grid-cols-2
				"
				onSubmit={onCreateAttribute}
			>
				<label className="block text-sm sm:col-span-2">
					<span className="font-semibold">
						Name
					</span>
					<input
						className={fieldClassName}
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
						placeholder="Color"
					/>
				</label>
				<label className="block text-sm">
					<span className="font-semibold">
						Kind
					</span>
					<select
						className={fieldClassName}
						value={valueKind}
						onChange={(event) =>
							setValueKind(event.target.value as typeof valueKind)
						}
					>
						<option value="OPTION">
							Option list
						</option>
						<option value="SCALAR_STRING">
							Text
						</option>
						<option value="SCALAR_NUMBER">
							Number
						</option>
						<option value="SCALAR_BOOLEAN">
							Yes / no
						</option>
					</select>
				</label>
				{isSuperVendor
					? (
							<label
								className="
									flex
									items-end
									gap-2
									pb-2
									text-sm
								"
							>
								<input
									type="checkbox"
									checked={asGlobal}
									onChange={(event) => setAsGlobal(event.target.checked)}
								/>
								Global
							</label>
						)
					: (
							<span className="hidden sm:block" />
						)
				}
				<div
					className="
						flex
						justify-end
						sm:col-span-2
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
						"
						disabled={submitting}
						type="submit"
					>
						Add attribute
					</button>
				</div>
			</form>

			<form
				className="
					grid
					gap-3
				"
				onSubmit={onCreateValue}
			>
				<label className="block text-sm">
					<span className="font-semibold">
						Attribute
					</span>
					<select
						className={fieldClassName}
						value={valueAttributeId}
						onChange={(event) => setValueAttributeId(event.target.value)}
						required
					>
						<option value="">
							Select attribute
						</option>
						{attributes
							.filter((row) => (row.valueKind ?? 'OPTION') === 'OPTION')
							.map((attribute) => (
								<option
									key={attribute.id}
									value={attribute.id}
								>
									{attribute.name}
									{attribute.vendorId ? ' · vendor' : ''}
								</option>
							))
						}
					</select>
				</label>
				<label className="block text-sm">
					<span className="font-semibold">
						Value
					</span>
					<input
						className={fieldClassName}
						value={valueText}
						onChange={(event) => setValueText(event.target.value)}
						required
						placeholder="Red"
					/>
				</label>
				{globalParents.length > 0
					? (
							<label className="block text-sm">
								<span className="font-semibold">
									Roll up to
								</span>
								<select
									className={fieldClassName}
									value={parentId}
									onChange={(event) => setParentId(event.target.value)}
								>
									<option value="">
										None
									</option>
									{globalParents.map((value) => (
										<option
											key={value.id}
											value={value.id}
										>
											{value.value}
										</option>
									))}
								</select>
							</label>
						)
					: null
				}
				<fieldset>
					<legend className="text-sm font-semibold">
						Categories
					</legend>
					<div
						className="
							mt-2
							max-h-40
							overflow-y-auto
							rounded-lg
							border
							border-slate-200
						"
					>
						{categoryTree.map((row) => (
							<label
								key={row.id}
								className="
									flex
									items-center
									gap-2
									px-3
									py-1.5
									text-sm
								"
							>
								<input
									type="checkbox"
									checked={categoryIds.includes(row.id)}
									onChange={() => {
										setCategoryIds((prev) =>
											prev.includes(row.id)
												? prev.filter((id) => id !== row.id)
												: [...prev, row.id],
										);
									}}
								/>
								{row.label}
							</label>
						))}
					</div>
				</fieldset>
				<div className="flex justify-end">
					<button
						className="
							rounded-full
							bg-sky
							px-4
							py-2
							text-sm
							font-semibold
							text-white
						"
						disabled={submitting}
						type="submit"
					>
						Add value
					</button>
				</div>
			</form>

			{error
				? (
						<p className="text-sm text-red-700">
							{error}
						</p>
					)
				: null
			}

			<section
				className="
					flex
					flex-col
					gap-2
				"
			>
				<h2 className="text-lg font-semibold text-ink">
					Global
				</h2>
				{globals.length === 0
					? (
							<p className="text-sm text-slate-500">
								No global attributes yet.
							</p>
						)
					: (
							<ul
								className="
									divide-y
									divide-slate-200
									border-y
									border-slate-200
								"
							>
								{globals.map((attribute) => (
									<AttributeRow
										key={attribute.id}
										attribute={attribute}
										values={attribute.values.filter((row) => !row.vendorId)}
									/>
								))}
							</ul>
						)
				}
			</section>

			<section
				className="
					flex
					flex-col
					gap-2
				"
			>
				<h2 className="text-lg font-semibold text-ink">
					This vendor
				</h2>
				{mine.length === 0 && vendorScopedGlobals.length === 0
					? (
							<p className="text-sm text-slate-500">
								No vendor attributes yet.
							</p>
						)
					: (
							<ul
								className="
									divide-y
									divide-slate-200
									border-y
									border-slate-200
								"
							>
								{mine.map((attribute) => (
									<AttributeRow
										key={attribute.id}
										attribute={attribute}
										values={attribute.values}
									/>
								))}
								{vendorScopedGlobals.map(({ attribute, values }) => (
									<AttributeRow
										key={`vendor-${attribute.id}`}
										attribute={attribute}
										values={values}
									/>
								))}
							</ul>
						)
				}
			</section>
		</div>
	);
}

export default function AttributesManagePage() {
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
				reasonKey="attributes"
			>
				<AttributesPageContent />
			</RequireAccess>
		</Suspense>
	);
}
