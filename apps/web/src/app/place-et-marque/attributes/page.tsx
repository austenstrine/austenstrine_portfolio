'use client';

import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { RequireAccess } from '../../../components/auth/RequireAccess';
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
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">
					Attributes
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					Globals are shared option lists (Color, Size). Vendor values can roll up to a global
					option and apply to a few categories without copying by hand.
				</p>
			</div>

			{user
				? (
						<p className="text-sm text-slate-600">
							Signed in as {user.email}
						</p>
					)
				: null
			}

			{vendors.length > 1
				? (
						<label className="block max-w-sm text-sm">
							<span className="font-semibold">
								Vendor
							</span>
							<select
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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

			<form
				className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
				onSubmit={onCreateAttribute}
			>
				<h2 className="font-semibold">
					New attribute
				</h2>
				<label className="block text-sm">
					<span className="font-semibold">
						Name
					</span>
					<input
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						value={name}
						onChange={(event) => setName(event.target.value)}
						required
					/>
				</label>
				<label className="block text-sm">
					<span className="font-semibold">
						Kind
					</span>
					<select
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
							<label className="flex items-center gap-2 text-sm">
								<input
									type="checkbox"
									checked={asGlobal}
									onChange={(event) => setAsGlobal(event.target.checked)}
								/>
								Create as global
							</label>
						)
					: null
				}
				<button
					className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
					disabled={submitting}
					type="submit"
				>
					Add attribute
				</button>
			</form>

			<form
				className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
				onSubmit={onCreateValue}
			>
				<h2 className="font-semibold">
					New option value
				</h2>
				<label className="block text-sm">
					<span className="font-semibold">
						Attribute
					</span>
					<select
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
									{attribute.vendorId ? ' (vendor)' : ''}
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
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						value={valueText}
						onChange={(event) => setValueText(event.target.value)}
						required
					/>
				</label>
				{globalParents.length > 0
					? (
							<label className="block text-sm">
								<span className="font-semibold">
									Roll up to
								</span>
								<select
									className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
				<div>
					<p className="text-sm font-semibold">
						Categories
					</p>
					<p className="text-xs text-slate-500">
						Vendor values need at least one category. Copies stay hidden.
					</p>
					<div className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200">
						{categoryTree.map((row) => (
							<label
								key={row.id}
								className="flex items-center gap-2 px-3 py-1.5 text-sm"
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
				</div>
				<button
					className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white"
					disabled={submitting}
					type="submit"
				>
					Add value
				</button>
			</form>

			{error
				? (
						<p className="text-sm text-red-700">
							{error}
						</p>
					)
				: null
			}

			<section className="space-y-3">
				<h2 className="text-lg font-semibold">
					Global
				</h2>
				{globals.map((attribute) => (
					<div
						className="rounded-xl border border-slate-200 bg-white p-4"
						key={attribute.id}
					>
						<p className="font-semibold">
							{attribute.name}
							<span className="ml-2 text-xs font-medium text-slate-500">
								{attribute.valueKind ?? 'OPTION'}
							</span>
						</p>
						<p className="mt-1 text-sm text-slate-600">
							{attribute.values.map((value) => value.value).join(', ') || 'No values yet'}
						</p>
					</div>
				))}
			</section>

			<section className="space-y-3">
				<h2 className="text-lg font-semibold">
					This vendor
				</h2>
				{mine.map((attribute) => (
					<div
						className="rounded-xl border border-slate-200 bg-white p-4"
						key={attribute.id}
					>
						<p className="font-semibold">
							{attribute.name}
						</p>
						<p className="mt-1 text-sm text-slate-600">
							{attribute.values.map((value) => value.value).join(', ') || 'No values yet'}
						</p>
					</div>
				))}
				{globals.map((attribute) => {
					const vendorValues = attribute.values.filter((row) => row.vendorId === vendorId);
					if(vendorValues.length === 0) {
						return null;
					}
					return (
						<div
							className="rounded-xl border border-slate-200 bg-white p-4"
							key={`vendor-${attribute.id}`}
						>
							<p className="font-semibold">
								{attribute.name}
								{' '}
								<span className="text-xs font-medium text-slate-500">
									vendor values
								</span>
							</p>
							<p className="mt-1 text-sm text-slate-600">
								{vendorValues.map((value) => value.value).join(', ')}
							</p>
						</div>
					);
				})}
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
