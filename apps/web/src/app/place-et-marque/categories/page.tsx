'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
	createCatalogCategory,
	listCatalogCategories,
	listMyVendors,
	requestCatalogCategory,
	updateCatalogCategory,
	uploadCatalogMedia,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';
import { CatalogCover } from '../../../components/catalog/CatalogCover';
import { CatalogImageField } from '../../../components/catalog/CatalogImageField';
import { TermHint } from '../../../components/catalog/TermHint';
import { UrlSlugField } from '../../../components/catalog/UrlSlugField';
import { ACCESS_REASONS, buildLoginUrl } from '../../../lib/accessGate';
import { sortCategoryTree } from '../../../lib/category-tree';

type CategoryRow = {
	id: string;
	slug: string;
	name: string;
	imageUrl?: string | null;
	parent?: { id: string; name: string; slug: string } | null;
	_count?: { products: number; children: number };
};

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export default function CategoryManagePage() {
	const { user, loading: sessionLoading } = useSession();
	const [categories, setCategories] = useState<CategoryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [isSuperVendor, setIsSuperVendor] = useState(false);
	const [hasVendor, setHasVendor] = useState(false);

	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [parentId, setParentId] = useState('');
	const [imageUrls, setImageUrls] = useState<string[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const [requestName, setRequestName] = useState('');
	const [requestParent, setRequestParent] = useState('');
	const [requestNote, setRequestNote] = useState('');
	const [requestError, setRequestError] = useState<string | null>(null);
	const [requestMessage, setRequestMessage] = useState<string | null>(null);
	const [requestBusy, setRequestBusy] = useState(false);
	const categoryTree = sortCategoryTree(categories);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setCategories(await listCatalogCategories());
		}
		catch {
			setCategories([]);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	useEffect(() => {
		if(!user) {
			setIsSuperVendor(false);
			setHasVendor(false);
			return;
		}
		listMyVendors()
			.then((vendors) => {
				setHasVendor(vendors.length > 0);
				setIsSuperVendor(
					vendors.some(
						(vendor) =>
							vendor.isSuperVendor
							&& (vendor.myRole === 'OWNER' || vendor.myRole === 'EDITOR'),
					),
				);
			})
			.catch(() => {
				setHasVendor(false);
				setIsSuperVendor(false);
			});
	}, [user]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await createCatalogCategory({
				name: name.trim(),
				slug: slug.trim(),
				parentId: parentId || undefined,
				imageUrl: imageUrls[0],
			});
			setName('');
			setSlug('');
			setParentId('');
			setImageUrls([]);
			setSlugTouched(false);
			await refresh();
		}
		catch(submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Could not create category.',
			);
		}
		finally {
			setSubmitting(false);
		}
	};

	const onRequest = async (event: FormEvent) => {
		event.preventDefault();
		setRequestError(null);
		setRequestMessage(null);
		setRequestBusy(true);
		try {
			const result = await requestCatalogCategory({
				name: requestName.trim(),
				suggestedParent: requestParent.trim() || undefined,
				note: requestNote.trim() || undefined,
			});
			setRequestMessage(result.message);
			setRequestName('');
			setRequestParent('');
			setRequestNote('');
		}
		catch(submitError) {
			setRequestError(
				submitError instanceof Error
					? submitError.message
					: 'Could not send category request.',
			);
		}
		finally {
			setRequestBusy(false);
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
			<div>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
					"
				>
					Categories
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Place et Marque categories are predefined for consistent browse and search.
					Only the austenstrine.dev
					{' '}
					<span
						className="
							inline-flex
							items-center
							gap-1
						"
					>
						supervendor
						<TermHint
							termId="supervendor"
						/>
					</span>
					{' '}
					can add or change them. Vendors can
					still free-tag products, and request new categories below.
				</p>
			</div>

			{sessionLoading
				? (
						<p className="text-sm text-slate-500">
							Checking session…
						</p>
					)
				: null
			}

			{isSuperVendor
				? (
						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<h2 className="text-lg font-semibold">
								Create category
							</h2>
							<p
								className="
									mt-1
									text-sm
									text-slate-600
								"
							>
								Supervendor tools — changes apply across all of Place et Marque.
							</p>
							<form
								className="
									mt-4
									flex
									flex-col
									gap-4
								"
								onSubmit={onSubmit}
							>
								<label className="block text-sm">
									<span className="font-semibold">
										Name
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
										value={name}
										onChange={(event) => {
											setName(event.target.value);
											if(!slugTouched) {
												setSlug(slugify(event.target.value));
											}
										}}
										required
										minLength={2}
										maxLength={120}
									/>
								</label>

								<UrlSlugField
									label="Category URL"
									value={slug}
									onChange={(next) => {
										setSlugTouched(true);
										setSlug(slugify(next));
									}}
									prefixPath="/place-et-marque/search?category="
									placeholder="wire-and-cable"
								/>

								<CatalogImageField
									kind="category"
									value={imageUrls}
									onChange={setImageUrls}
								/>

								<label className="block text-sm">
									<span className="font-semibold">
										Parent category
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
										value={parentId}
										onChange={(event) => setParentId(event.target.value)}
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
									disabled={submitting}
								>
									{submitting
										? 'Creating…'
										: 'Create category'
									}
								</button>
							</form>
						</section>
					)
				: null
			}

			{!isSuperVendor
				? (
						<section
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
							"
						>
							<h2 className="text-lg font-semibold">
								Request a category
							</h2>
							<p
								className="
									mt-1
									text-sm
									text-slate-600
								"
							>
								Need a category that isn&apos;t listed? Send a request to the Place et Marque
								team. Until then, use product tags for finer labeling.
							</p>

							{!user
								? (
										<p
											className="
												mt-4
												text-sm
												text-amber-800
											"
										>
											{ACCESS_REASONS.categories}
											{' '}
											<a
												className="
													font-semibold
													text-sky
													hover:underline
												"
												href={buildLoginUrl({
													next: '/place-et-marque/categories',
													reason: ACCESS_REASONS.categories,
												})}
											>
												Sign in
											</a>
										</p>
									)
								: null
							}

							{user && !hasVendor
								? (
										<p
											className="
												mt-4
												text-sm
												text-amber-800
											"
										>
											Join or create a vendor organization before requesting categories.{' '}
											<a
												className="
													font-semibold
													text-sky
													hover:underline
												"
												href="/place-et-marque/vendors?next=%2Fplace-et-marque%2Fcategories"
											>
												Go to vendors
											</a>
										</p>
									)
								: null
							}

							{user && hasVendor
								? (
										<form
											className="
												mt-4
												flex
												flex-col
												gap-4
											"
											onSubmit={onRequest}
										>
											<label className="block text-sm">
												<span className="font-semibold">
													Requested category name
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
													value={requestName}
													onChange={(event) => setRequestName(event.target.value)}
													required
													minLength={2}
													maxLength={120}
													placeholder="Conduit & Raceway"
												/>
											</label>
											<label className="block text-sm">
												<span className="font-semibold">
													Suggested parent (optional)
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
													value={requestParent}
													onChange={(event) => setRequestParent(event.target.value)}
													maxLength={120}
												/>
											</label>
											<label className="block text-sm">
												<span className="font-semibold">
													Why you need it
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
													value={requestNote}
													onChange={(event) => setRequestNote(event.target.value)}
													rows={3}
													maxLength={2000}
												/>
											</label>
											{requestError
												? (
														<p className="text-sm text-red-700">
															{requestError}
														</p>
													)
												: null
											}
											{requestMessage
												? (
														<p className="text-sm text-emerald-700">
															{requestMessage}
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
												disabled={requestBusy}
											>
												{requestBusy
													? 'Sending…'
													: 'Send request'
												}
											</button>
										</form>
									)
								: null
							}
						</section>
					)
				: null
			}

			<section
				className="
					flex
					flex-col
					gap-3
				"
			>
				<h2 className="text-lg font-semibold">
					Categories
				</h2>
				{loading
					? (
							<p className="text-sm text-slate-500">
								Loading…
							</p>
						)
					: null
				}
				{!loading && categories.length === 0
					? (
							<p className="text-sm text-slate-500">
								No categories yet.
							</p>
						)
					: null
				}
				{categoryTree.map((category) => (
					<div
						className="
							flex
							flex-col
							gap-4
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
							sm:flex-row
							sm:items-start
						"
						key={category.id}
						style={{ marginLeft: `${category.depth * 16}px` }}
					>
						<div className="h-20 w-32 shrink-0 overflow-hidden rounded-lg bg-slate-100">
							<CatalogCover
								src={category.imageUrl}
								alt=""
								className="h-full w-full object-cover"
								width={256}
								height={160}
								fallback={
									<div className="flex h-full items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
										No photo
									</div>
								}
							/>
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-semibold">
								{category.name}
							</p>
							<p className="text-sm text-slate-600">
								/{category.slug}
								{category.parent
									? ` · under ${category.parent.name}`
									: ''
								}
							</p>
							<p
								className="
									mt-1
									text-xs
									text-slate-500
								"
							>
								{category._count?.products ?? 0} products ·{' '}
								{category._count?.children ?? 0} children
							</p>
							{isSuperVendor
								? (
									<div className="mt-3 flex flex-wrap gap-2">
										<label className="cursor-pointer rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:border-sky">
											{category.imageUrl ? 'Replace image' : 'Upload image'}
											<input
												type="file"
												accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
												className="hidden"
												onChange={(event) => {
													const file = event.target.files?.[0];
													event.target.value = '';
													if(!file) {
														return;
													}
													void uploadCatalogMedia({
														file,
														kind: 'category',
														categoryId: category.id,
													}).then((stored) => {
														setCategories((rows) => rows.map((row) => (
															row.id === category.id
																? { ...row, imageUrl: stored.path }
																: row
														)));
													}).catch(() => undefined);
												}}
											/>
										</label>
										{category.imageUrl
											? (
												<button
													type="button"
													className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:border-red-400"
													onClick={() => {
														void updateCatalogCategory(category.id, { imageUrl: null })
															.then(() => {
																setCategories((rows) => rows.map((row) => (
																	row.id === category.id
																		? { ...row, imageUrl: null }
																		: row
																)));
															})
															.catch(() => undefined);
													}}
												>
													Remove
												</button>
											)
											: null}
									</div>
								)
								: null}
						</div>
					</div>
				))}
			</section>
		</div>
	);
}
