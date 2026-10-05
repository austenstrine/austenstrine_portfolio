'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	createCatalogProduct,
	listCatalogCategories,
	listMyVendors,
	listUoms,
	type UnitOfMeasure,
	type VendorSummary,
} from '../../../../lib/catalog-api';
import { saveWalkthroughState } from '../../../../lib/walkthrough';
import { useSession } from '../../../../lib/useSession';
import { UrlSlugField } from '../../../../components/catalog/UrlSlugField';

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function dollarsToCents(value: string): number {
	const parsed = Number(value);
	if(Number.isNaN(parsed) || parsed < 0) {
		return 0;
	}
	return Math.round(parsed * 100);
}

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
	const [sku, setSku] = useState(walkthrough ? 'WIRE-THHN-12-500' : '');
	const [slug, setSlug] = useState(walkthrough ? 'thhn-12-gauge-wire-500ft' : '');
	const [slugTouched, setSlugTouched] = useState(walkthrough);
	const [description, setDescription] = useState(
		walkthrough
			? 'Sold as a full spool or by the foot, with shared pack/piece inventory.'
			: '',
	);
	const [packUomId, setPackUomId] = useState('');
	const [pieceUomId, setPieceUomId] = useState('');
	const [packPrice, setPackPrice] = useState(walkthrough ? '89.99' : '');
	const [piecePrice, setPiecePrice] = useState(walkthrough ? '0.22' : '');
	const [packQty, setPackQty] = useState(walkthrough ? '3' : '0');
	const [pieceQtyPerPack, setPieceQtyPerPack] = useState(walkthrough ? '500' : '');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

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
				if(spool) {
					setPackUomId(spool.id);
				}
				if(foot) {
					setPieceUomId(foot.id);
				}
			})
			.catch(() => undefined);
	}, [user, vendorId, categoryId, searchParams]);

	const selectedVendor = useMemo(
		() => vendors.find((row) => row.id === vendorId) ?? null,
		[vendors, vendorId],
	);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);

		if(!vendorId || !packUomId || !pieceUomId) {
			setError('Vendor, pack UOM, and piece UOM are required.');
			return;
		}

		setSubmitting(true);

		try {
			const product = await createCatalogProduct({
				vendorId,
				categoryId: categoryId || undefined,
				sku: sku.trim(),
				slug: slug.trim(),
				title: title.trim(),
				description: description.trim() || undefined,
				inventoryFromAllocations: true,
				attributes: walkthrough
					? [
							{ key: 'gauge', value: '12 AWG', sortOrder: 0 },
							{ key: 'conductor', value: 'Copper', sortOrder: 1 },
						]
					: undefined,
				offerings: [
					{
						uomId: packUomId,
						role: 'PACK',
						priceCents: dollarsToCents(packPrice),
						qtyOnHand: packQty || '0',
						tracksOwnQty: true,
					},
					{
						uomId: pieceUomId,
						role: 'PIECE',
						priceCents: dollarsToCents(piecePrice),
						qtyOnHand: '0',
						tracksOwnQty: false,
					},
				],
				packPieceLink: {
					pieceQtyPerPack: pieceQtyPerPack || '1',
				},
			});

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
		} catch (submitError) {
			setError(
				submitError instanceof Error ? submitError.message : 'Could not create product.',
			);
		} finally {
			setSubmitting(false);
		}
	};

	if(sessionLoading) {
		return <p className="text-sm text-slate-500">Checking session…</p>;
	}

	if(!user) {
		return (
			<p className="text-sm text-amber-800">
				Sign in to create products.{' '}
				<a href="/auth/login" className="font-semibold text-sky hover:underline">
					Sign in
				</a>
			</p>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">
					{walkthrough ? 'Create sample product' : 'Create product'}
				</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					{walkthrough
						? 'This walkthrough creates one catalog product with two offerings: a pack (spool) and a piece (foot), linked so inventory can break packs into piece UOM.'
						: 'Create a catalog product with pack and piece offerings.'}
				</p>
			</div>

			{vendors.length === 0 ? (
				<p className="text-sm text-amber-800">
					Create a vendor first.{' '}
					<a href="/shop/vendors" className="font-semibold text-sky hover:underline">
						Go to vendors
					</a>
				</p>
			) : null}

			{uoms.length < 2 ? (
				<p className="text-sm text-amber-800">
					You need at least two UOMs (for example SPOOL and FT).{' '}
					<a href="/shop/uoms" className="font-semibold text-sky hover:underline">
						Manage UOMs
					</a>
				</p>
			) : null}

			<form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5">
				<label className="block text-sm">
					<span className="font-semibold">Vendor</span>
					<select
						value={vendorId}
						onChange={(event) => setVendorId(event.target.value)}
						required
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					>
						<option value="">Select vendor</option>
						{vendors.map((vendor) => (
							<option key={vendor.id} value={vendor.id}>
								{vendor.name}
							</option>
						))}
					</select>
				</label>

				<label className="block text-sm">
					<span className="font-semibold">Category</span>
					<select
						value={categoryId}
						onChange={(event) => setCategoryId(event.target.value)}
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					>
						<option value="">None</option>
						{categories.map((category) => (
							<option key={category.id} value={category.id}>
								{category.name}
							</option>
						))}
					</select>
				</label>

				<label className="block text-sm">
					<span className="font-semibold">Title</span>
					<input
						value={title}
						onChange={(event) => {
							setTitle(event.target.value);
							if(!slugTouched) {
								setSlug(slugify(event.target.value));
							}
						}}
						required
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					/>
				</label>

				<div className="grid gap-4 md:grid-cols-2">
					<label className="block text-sm">
						<span className="font-semibold">SKU</span>
						<input
							value={sku}
							onChange={(event) => setSku(event.target.value)}
							required
							className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
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
						helpText="Appears after your store address in the product page URL."
					/>
				</div>

				<label className="block text-sm">
					<span className="font-semibold">Description</span>
					<textarea
						value={description}
						onChange={(event) => setDescription(event.target.value)}
						rows={3}
						className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					/>
				</label>

				<div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
					<h2 className="font-semibold">Pack offering</h2>
					<div className="mt-3 grid gap-3 md:grid-cols-3">
						<label className="block text-sm">
							<span className="font-semibold">UOM</span>
							<select
								value={packUomId}
								onChange={(event) => setPackUomId(event.target.value)}
								required
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							>
								<option value="">Select</option>
								{uoms.map((uom) => (
									<option key={uom.id} value={uom.id}>
										{uom.code} · {uom.label}
									</option>
								))}
							</select>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Price ($)</span>
							<input
								value={packPrice}
								onChange={(event) => setPackPrice(event.target.value)}
								required
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Qty on hand</span>
							<input
								value={packQty}
								onChange={(event) => setPackQty(event.target.value)}
								required
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
					</div>
				</div>

				<div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
					<h2 className="font-semibold">Piece offering</h2>
					<div className="mt-3 grid gap-3 md:grid-cols-3">
						<label className="block text-sm">
							<span className="font-semibold">UOM</span>
							<select
								value={pieceUomId}
								onChange={(event) => setPieceUomId(event.target.value)}
								required
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							>
								<option value="">Select</option>
								{uoms.map((uom) => (
									<option key={uom.id} value={uom.id}>
										{uom.code} · {uom.label}
									</option>
								))}
							</select>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Price ($)</span>
							<input
								value={piecePrice}
								onChange={(event) => setPiecePrice(event.target.value)}
								required
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-semibold">Piece qty per pack</span>
							<input
								value={pieceQtyPerPack}
								onChange={(event) => setPieceQtyPerPack(event.target.value)}
								required
								placeholder="500"
								className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
							/>
						</label>
					</div>
				</div>

				{error ? <p className="text-sm text-red-700">{error}</p> : null}

				<button
					type="submit"
					disabled={submitting || vendors.length === 0}
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
				>
					{submitting ? 'Creating…' : 'Create product'}
				</button>
			</form>
		</div>
	);
}

export default function NewProductPage() {
	return (
		<Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
			<NewProductForm />
		</Suspense>
	);
}
