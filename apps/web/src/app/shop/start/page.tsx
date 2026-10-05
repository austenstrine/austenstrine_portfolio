'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
	createCatalogCategory,
	createUom,
	createVendor,
	listCatalogCategories,
	listMyVendors,
	listUoms,
	type UnitOfMeasure,
	type VendorSummary,
} from '../../../lib/catalog-api';
import {
	loadWalkthroughState,
	saveWalkthroughState,
	type WalkthroughState,
} from '../../../lib/walkthrough';
import { useSession } from '../../../lib/useSession';
import { UrlSlugField } from '../../../components/catalog/UrlSlugField';

type StepId = 'account' | 'vendor' | 'uoms' | 'category' | 'product' | 'explore';

type Step = {
	id: StepId;
	title: string;
	summary: string;
};

const steps: Step[] = [
	{
		id: 'account',
		title: 'Create or sign in',
		summary: 'You need an authenticated account before vendor and catalog actions.',
	},
	{
		id: 'vendor',
		title: 'Create a vendor',
		summary: 'Creating a vendor makes you its OWNER (admin) and sets the store URL used in product links.',
	},
	{
		id: 'uoms',
		title: 'Add units of measure',
		summary: 'Nothing is seeded. Add at least a pack UOM and a piece UOM (for example SPOOL and FT).',
	},
	{
		id: 'category',
		title: 'Create a category',
		summary: 'Categories organize browse/search and get assigned when you create a product.',
	},
	{
		id: 'product',
		title: 'Create a pack/piece product',
		summary: 'Create one product with two offerings, linked as a pack/piece pair.',
	},
	{
		id: 'explore',
		title: 'Browse, search, and quick-edit',
		summary: 'Open the storefront surfaces. On the product page, quick-edit appears because you own the vendor.',
	},
];

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

function WalkthroughContent() {
	const searchParams = useSearchParams();
	const { user, loading: sessionLoading } = useSession();
	const [state, setState] = useState<WalkthroughState>({});
	const [vendors, setVendors] = useState<VendorSummary[]>([]);
	const [uoms, setUoms] = useState<UnitOfMeasure[]>([]);
	const [categories, setCategories] = useState<Array<{ id: string; name: string; slug: string }>>([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const [vendorName, setVendorName] = useState('');
	const [vendorSlug, setVendorSlug] = useState('');
	const [vendorSlugTouched, setVendorSlugTouched] = useState(false);

	const [categoryName, setCategoryName] = useState('Wire & Cable');
	const [categorySlug, setCategorySlug] = useState('wire-and-cable');
	const [categorySlugTouched, setCategorySlugTouched] = useState(true);

	const done = searchParams.get('done') === '1';
	const doneVendor = searchParams.get('vendor');
	const doneProduct = searchParams.get('product');

	const refresh = useCallback(async () => {
		const saved = loadWalkthroughState();
		setState(saved);

		if(!user) {
			setVendors([]);
			return;
		}

		const [vendorRows, uomRows, categoryRows] = await Promise.all([
			listMyVendors().catch(() => []),
			listUoms().catch(() => []),
			listCatalogCategories().catch(() => []),
		]);

		setVendors(vendorRows);
		setUoms(uomRows);
		setCategories(categoryRows);

		const patch: Partial<WalkthroughState> = {};
		if(!saved.vendorId && vendorRows[0]) {
			patch.vendorId = vendorRows[0].id;
			patch.vendorSlug = vendorRows[0].slug;
		}
		if(!saved.categoryId && categoryRows[0]) {
			patch.categoryId = categoryRows[0].id;
			patch.categorySlug = categoryRows[0].slug;
		}
		if(doneVendor && doneProduct) {
			patch.vendorSlug = doneVendor;
			patch.productSlug = doneProduct;
			patch.completedAt = new Date().toISOString();
		}
		if(Object.keys(patch).length > 0) {
			setState(saveWalkthroughState(patch));
		}
	}, [user, doneVendor, doneProduct]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const hasPackAndPieceUoms = useMemo(() => {
		const codes = new Set(uoms.map((row) => row.code));
		return codes.has('SPOOL') && codes.has('FT');
	}, [uoms]);

	const activeStep: StepId = useMemo(() => {
		if(!user) {
			return 'account';
		}
		if(vendors.length === 0 && !state.vendorId) {
			return 'vendor';
		}
		if(!hasPackAndPieceUoms) {
			return 'uoms';
		}
		if(categories.length === 0 && !state.categoryId) {
			return 'category';
		}
		if(!state.productSlug) {
			return 'product';
		}
		return 'explore';
	}, [user, vendors.length, state.vendorId, state.categoryId, state.productSlug, hasPackAndPieceUoms, categories.length]);

	const ensureStarterUoms = async () => {
		setBusy(true);
		setError(null);
		try {
			const existing = new Set(uoms.map((row) => row.code));
			if(!existing.has('SPOOL')) {
				await createUom({
					code: 'SPOOL',
					label: 'Spool',
					dimensionKey: 'count',
					factorToReference: '1',
				});
			}
			if(!existing.has('FT')) {
				await createUom({
					code: 'FT',
					label: 'Foot',
					dimensionKey: 'length',
					factorToReference: '0.3048',
				});
			}
			await refresh();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not create UOMs.');
		} finally {
			setBusy(false);
		}
	};

	const onCreateVendor = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const vendor = await createVendor({
				name: vendorName.trim(),
				slug: vendorSlug.trim(),
			});
			setState(
				saveWalkthroughState({
					vendorId: vendor.id,
					vendorSlug: vendor.slug,
				}),
			);
			setVendorName('');
			setVendorSlug('');
			setVendorSlugTouched(false);
			await refresh();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not create vendor.');
		} finally {
			setBusy(false);
		}
	};

	const onCreateCategory = async (event: FormEvent) => {
		event.preventDefault();
		setBusy(true);
		setError(null);
		try {
			const category = await createCatalogCategory({
				name: categoryName.trim(),
				slug: categorySlug.trim(),
			});
			setState(
				saveWalkthroughState({
					categoryId: category.id,
					categorySlug: category.slug,
				}),
			);
			await refresh();
		} catch (submitError) {
			setError(submitError instanceof Error ? submitError.message : 'Could not create category.');
		} finally {
			setBusy(false);
		}
	};

	const productHref =
		state.vendorSlug && state.productSlug
			? `/shop/${state.vendorSlug}/${state.productSlug}`
			: null;

	const productCreateHref = `/shop/products/new?walkthrough=1${
		state.vendorId ? `&vendorId=${encodeURIComponent(state.vendorId)}` : ''
	}${state.categoryId ? `&categoryId=${encodeURIComponent(state.categoryId)}` : ''}`;

	return (
		<div className="flex flex-col gap-8">
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky">
					Guided walkthrough
				</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight">
					Build the marketplace from an empty database
				</h1>
				<p className="mt-2 max-w-3xl text-slate-600">
					No seed data is required. Follow these steps to create an account, vendor, UOMs,
					category, and a pack/piece product, then explore search and the product page with
					quick-edit.
				</p>
			</div>

			{done && productHref ? (
				<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
					<p className="font-semibold">Product created.</p>
					<p className="mt-1">
						Continue below to browse, search, and open the product page. Quick-edit shows because
						you are the vendor OWNER.
					</p>
				</div>
			) : null}

			<ol className="grid gap-3">
				{steps.map((step, index) => {
					const isActive = step.id === activeStep;
					const isDone =
						(step.id === 'account' && Boolean(user))
						|| (step.id === 'vendor' && (vendors.length > 0 || Boolean(state.vendorId)))
						|| (step.id === 'uoms' && hasPackAndPieceUoms)
						|| (step.id === 'category' && (categories.length > 0 || Boolean(state.categoryId)))
						|| (step.id === 'product' && Boolean(state.productSlug))
						|| (step.id === 'explore' && Boolean(state.productSlug));

					return (
						<li
							key={step.id}
							className={
								isActive
									? 'rounded-2xl border border-sky bg-sky/5 p-5'
									: 'rounded-2xl border border-slate-200 bg-white p-5'
							}
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
										Step {index + 1}
									</p>
									<h2 className="mt-1 text-lg font-semibold">{step.title}</h2>
									<p className="mt-1 text-sm text-slate-600">{step.summary}</p>
								</div>
								<span
									className={
										isDone
											? 'rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-800'
											: isActive
												? 'rounded-full bg-sky px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white'
												: 'rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600'
									}
								>
									{isDone ? 'Done' : isActive ? 'Current' : 'Upcoming'}
								</span>
							</div>

							{isActive && step.id === 'account' ? (
								<div className="mt-4 flex flex-wrap gap-3">
									{sessionLoading ? (
										<p className="text-sm text-slate-500">Checking session…</p>
									) : (
										<>
											<a
												href="/auth/register?next=%2Fshop%2Fstart"
												className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sky"
											>
												Create account
											</a>
											<a
												href="/auth/login?next=%2Fshop%2Fstart"
												className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky hover:text-sky"
											>
												Sign in
											</a>
										</>
									)}
								</div>
							) : null}

							{isActive && step.id === 'vendor' ? (
								<form onSubmit={onCreateVendor} className="mt-4 flex flex-col gap-3">
									<label className="block text-sm">
										<span className="font-semibold">Organization name</span>
										<input
											value={vendorName}
											onChange={(event) => {
												setVendorName(event.target.value);
												if(!vendorSlugTouched) {
													setVendorSlug(slugify(event.target.value));
												}
											}}
											required
											className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
										/>
									</label>
									<UrlSlugField
										label="Store URL"
										value={vendorSlug}
										onChange={(next) => {
											setVendorSlugTouched(true);
											setVendorSlug(slugify(next));
										}}
										prefixPath="/shop"
										placeholder="your-store"
										helpText="This becomes the public address for your storefront links."
									/>
									<button
										type="submit"
										disabled={busy}
										className="self-start rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sky disabled:opacity-60"
									>
										{busy ? 'Creating…' : 'Create vendor as OWNER'}
									</button>
								</form>
							) : null}

							{isActive && step.id === 'uoms' ? (
								<div className="mt-4 flex flex-col gap-3">
									<p className="text-sm text-slate-600">
										Current UOMs: {uoms.length === 0 ? 'none' : uoms.map((row) => row.code).join(', ')}
									</p>
									<div className="flex flex-wrap gap-3">
										<button
											type="button"
											onClick={() => void ensureStarterUoms()}
											disabled={busy}
											className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sky disabled:opacity-60"
										>
											{busy ? 'Creating…' : 'Add SPOOL + FT'}
										</button>
										<a
											href="/shop/uoms"
											className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky hover:text-sky"
										>
											Manage all UOMs
										</a>
									</div>
								</div>
							) : null}

							{isActive && step.id === 'category' ? (
								<form onSubmit={onCreateCategory} className="mt-4 flex flex-col gap-3">
									<label className="block text-sm">
										<span className="font-semibold">Category name</span>
										<input
											value={categoryName}
											onChange={(event) => {
												setCategoryName(event.target.value);
												if(!categorySlugTouched) {
													setCategorySlug(slugify(event.target.value));
												}
											}}
											required
											className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
										/>
									</label>
									<UrlSlugField
										label="Category URL key"
										value={categorySlug}
										onChange={(next) => {
											setCategorySlugTouched(true);
											setCategorySlug(slugify(next));
										}}
										prefixPath="/shop/search?category="
										placeholder="wire-and-cable"
										helpText="Used when browsing or filtering by this category."
									/>
									<button
										type="submit"
										disabled={busy}
										className="self-start rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sky disabled:opacity-60"
									>
										{busy ? 'Creating…' : 'Create category'}
									</button>
								</form>
							) : null}

							{isActive && step.id === 'product' ? (
								<div className="mt-4 flex flex-wrap gap-3">
									<a
										href={productCreateHref}
										className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sky"
									>
										Create pack/piece product
									</a>
									<a
										href="/shop/products/new"
										className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky hover:text-sky"
									>
										Open blank product form
									</a>
								</div>
							) : null}

							{isActive && step.id === 'explore' ? (
								<div className="mt-4 flex flex-wrap gap-3">
									{productHref ? (
										<a
											href={productHref}
											className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white hover:bg-sky"
										>
											View product + quick-edit
										</a>
									) : null}
									<a
										href="/shop"
										className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky hover:text-sky"
									>
										Browse catalog
									</a>
									<a
										href={
											state.categorySlug
												? `/shop/search?category=${encodeURIComponent(state.categorySlug)}`
												: '/shop/search'
										}
										className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky hover:text-sky"
									>
										Search / browse by category
									</a>
									<a
										href="/shop/manage"
										className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-sky hover:text-sky"
									>
										Product management
									</a>
								</div>
							) : null}
						</li>
					);
				})}
			</ol>

			{error ? <p className="text-sm text-red-700">{error}</p> : null}

			{user ? (
				<p className="text-sm text-slate-500">Signed in as {user.email}</p>
			) : null}
		</div>
	);
}

export default function WalkthroughPage() {
	return (
		<Suspense fallback={<p className="text-sm text-slate-500">Loading walkthrough…</p>}>
			<WalkthroughContent />
		</Suspense>
	);
}
