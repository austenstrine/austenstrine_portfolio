'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { CrmShell } from '../../components/layout/CrmShell';
import { AuthApiError } from '../../lib/auth-api';
import { sortCategoryTree } from '../../lib/category-tree';
import {
	createCatalogCategory,
	listCatalogCategories,
	updateCatalogCategory,
	uploadCategoryMedia,
	type CatalogCategoryRow,
} from '../../lib/crm-api';

function slugify(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

export default function CategoriesAdminPage() {
	const [categories, setCategories] = useState<CatalogCategoryRow[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [parentId, setParentId] = useState('');
	const [imageUrl, setImageUrl] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const [busyId, setBusyId] = useState<string | null>(null);
	const categoryTree = sortCategoryTree(categories);

	const refresh = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setCategories(await listCatalogCategories());
		}
		catch(loadError) {
			setCategories([]);
			setError(
				loadError instanceof AuthApiError
					? loadError.message
					: 'Could not load categories.',
			);
		}
		finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	async function onCreate(event: FormEvent) {
		event.preventDefault();
		setSubmitting(true);
		setError(null);
		try {
			await createCatalogCategory({
				name: name.trim(),
				slug: slug.trim(),
				parentId: parentId || undefined,
				imageUrl: imageUrl ?? undefined,
			});
			setName('');
			setSlug('');
			setParentId('');
			setImageUrl(null);
			setSlugTouched(false);
			await refresh();
		}
		catch(submitError) {
			setError(
				submitError instanceof AuthApiError
					? submitError.message
					: 'Could not create category.',
			);
		}
		finally {
			setSubmitting(false);
		}
	}

	async function onUploadImage(categoryId: string, file: File) {
		setBusyId(categoryId);
		setError(null);
		try {
			const stored = await uploadCategoryMedia({ file, categoryId });
			setCategories((rows) => rows.map((row) => (
				row.id === categoryId
					? { ...row, imageUrl: stored.path }
					: row
			)));
		}
		catch(uploadError) {
			setError(
				uploadError instanceof AuthApiError
					? uploadError.message
					: 'Could not upload that image.',
			);
		}
		finally {
			setBusyId(null);
		}
	}

	async function onClearImage(categoryId: string) {
		setBusyId(categoryId);
		setError(null);
		try {
			await updateCatalogCategory(categoryId, { imageUrl: null });
			setCategories((rows) => rows.map((row) => (
				row.id === categoryId
					? { ...row, imageUrl: null }
					: row
			)));
		}
		catch(clearError) {
			setError(
				clearError instanceof AuthApiError
					? clearError.message
					: 'Could not remove that image.',
			);
		}
		finally {
			setBusyId(null);
		}
	}

	return (
		<CrmShell>
			<div
				className="
					mx-auto
					max-w-3xl
				"
			>
				<h1
					className="
						text-3xl
						font-semibold
						tracking-tight
						text-white
					"
				>
					Categories
				</h1>
				<p
					className="
						mt-3
						text-sm
						text-mist/75
					"
				>
					Create and edit Place et Marque browse categories. Sellers can still
					request new ones from the storefront.
				</p>

				{error
					? (
							<p
								className="
									mt-4
									rounded-lg
									border
									border-warn/40
									bg-warn/10
									px-3
									py-2
									text-sm
									text-warn
								"
								role="alert"
							>
								{error}
							</p>
						)
					: null
				}

				<section
					className="
						mt-8
						rounded-xl
						border
						border-line
						bg-panel/70
						px-5
						py-4
					"
				>
					<h2
						className="
							text-lg
							font-semibold
							text-white
						"
					>
						Create category
					</h2>
					<form
						className="
							mt-4
							flex
							flex-col
							gap-4
						"
						onSubmit={(event) => {
							void onCreate(event);
						}}
					>
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Name
							</span>
							<input
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
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
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Name in the link
							</span>
							<input
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									font-mono
									text-sm
									text-mist
								"
								value={slug}
								onChange={(event) => {
									setSlugTouched(true);
									setSlug(slugify(event.target.value));
								}}
								required
								minLength={2}
								maxLength={80}
								placeholder="wire-and-cable"
							/>
						</label>
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Parent (optional)
							</span>
							<select
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-line
									bg-rail
									px-3
									py-2
									text-sm
									text-mist
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
						<label className="block text-sm">
							<span className="font-medium text-mist">
								Image (optional)
							</span>
							<input
								type="file"
								accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
								className="
									mt-1
									block
									w-full
									text-sm
									text-mist/80
								"
								onChange={(event) => {
									const file = event.target.files?.[0];
									event.target.value = '';
									if(!file) {
										return;
									}
									void uploadCategoryMedia({ file })
										.then((stored) => setImageUrl(stored.path))
										.catch((uploadError) => {
											setError(
												uploadError instanceof AuthApiError
													? uploadError.message
													: 'Could not upload that image.',
											);
										});
								}}
							/>
							{imageUrl
								? (
										<p
											className="
												mt-1
												truncate
												font-mono
												text-xs
												text-mist/55
											"
										>
											{imageUrl}
										</p>
									)
								: null
							}
						</label>
						<button
							type="submit"
							disabled={submitting}
							className="
								self-start
								rounded-lg
								bg-glow
								px-4
								py-2
								text-sm
								font-semibold
								text-rail
								disabled:opacity-60
							"
						>
							{submitting
								? 'Creating…'
								: 'Create category'
							}
						</button>
					</form>
				</section>

				<section
					className="
						mt-10
						flex
						flex-col
						gap-4
					"
				>
					<h2
						className="
							text-lg
							font-semibold
							text-white
						"
					>
						All categories
					</h2>
					{loading
						? (
								<p className="text-sm text-mist/60">
									Loading categories…
								</p>
							)
						: null
					}
					{!loading && categories.length === 0 && !error
						? (
								<p className="text-sm text-mist/60">
									No categories yet.
								</p>
							)
						: null
					}
					<ul
						className="
							flex
							flex-col
							gap-3
						"
					>
						{categoryTree.map((category) => (
							<li
								key={category.id}
								className="
									rounded-xl
									border
									border-line
									bg-panel/70
									px-5
									py-4
								"
								style={{ marginLeft: `${category.depth * 12}px` }}
							>
								<p className="font-semibold text-white">
									{category.name}
								</p>
								<p
									className="
										mt-1
										font-mono
										text-sm
										text-mist/70
									"
								>
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
										text-mist/50
									"
								>
									{category._count?.products ?? 0} products ·{' '}
									{category._count?.children ?? 0} children
								</p>
								<div
									className="
										mt-3
										flex
										flex-wrap
										gap-2
									"
								>
									<label
										className="
											cursor-pointer
											rounded-lg
											border
											border-line
											px-3
											py-1.5
											text-xs
											font-semibold
											text-mist
											hover:border-glow/40
										"
									>
										{category.imageUrl
											? 'Replace image'
											: 'Upload image'
										}
										<input
											type="file"
											accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
											className="hidden"
											disabled={busyId === category.id}
											onChange={(event) => {
												const file = event.target.files?.[0];
												event.target.value = '';
												if(!file) {
													return;
												}
												void onUploadImage(category.id, file);
											}}
										/>
									</label>
									{category.imageUrl
										? (
												<button
													type="button"
													disabled={busyId === category.id}
													className="
														rounded-lg
														border
														border-line
														px-3
														py-1.5
														text-xs
														font-semibold
														text-warn
														disabled:opacity-60
													"
													onClick={() => {
														void onClearImage(category.id);
													}}
												>
													Remove image
												</button>
											)
										: null
									}
								</div>
							</li>
						))}
					</ul>
				</section>
			</div>
		</CrmShell>
	);
}
