'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
	createCatalogCategory,
	listCatalogCategories,
} from '../../../lib/catalog-api';
import { useSession } from '../../../lib/useSession';
import { UrlSlugField } from '../../../components/catalog/UrlSlugField';

type CategoryRow = {
	id: string;
	slug: string;
	name: string;
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
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [slugTouched, setSlugTouched] = useState(false);
	const [parentId, setParentId] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			setCategories(await listCatalogCategories());
		} catch {
			setCategories([]);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const onSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError(null);
		setSubmitting(true);

		try {
			await createCatalogCategory({
				name: name.trim(),
				slug: slug.trim(),
				parentId: parentId || undefined,
			});
			setName('');
			setSlug('');
			setParentId('');
			setSlugTouched(false);
			await refresh();
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: 'Could not create category.',
			);
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">Categories</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					Manage the taxonomy used by search filters and product assignment. New categories
					are rows—no schema change required to expand the tree.
				</p>
			</div>

			{sessionLoading ? <p className="text-sm text-slate-500">Checking session…</p> : null}

			{!sessionLoading && !user ? (
				<div
					className="
						rounded-2xl
						border
						border-amber-200
						bg-amber-50
						p-5
						text-sm
						text-amber-900
					"
				>
					<p>Sign in to create categories. Anyone can browse the existing list below.</p>
					<a href="/auth/login" className="mt-2 inline-block font-semibold text-sky hover:underline">
						Go to sign in
					</a>
				</div>
			) : null}

			{user ? (
				<section
					className="
						rounded-2xl
						border
						border-slate-200
						bg-white
						p-5
					"
				>
					<h2 className="text-lg font-semibold">Create category</h2>
					<form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
						<label className="block text-sm">
							<span className="font-semibold">Name</span>
							<input
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
								placeholder="Fasteners"
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-slate-300
									px-3
									py-2
								"
							/>
						</label>

						<UrlSlugField
							label="Category URL key"
							value={slug}
							onChange={(next) => {
								setSlugTouched(true);
								setSlug(slugify(next));
							}}
							prefixPath="/shop/search?category="
							placeholder="fasteners"
							helpText="Used in search/browse links for this category."
						/>

						<label className="block text-sm">
							<span className="font-semibold">Parent (optional)</span>
							<select
								value={parentId}
								onChange={(event) => setParentId(event.target.value)}
								className="
									mt-1
									w-full
									rounded-lg
									border
									border-slate-300
									px-3
									py-2
								"
							>
								<option value="">None</option>
								{categories.map((category) => (
									<option key={category.id} value={category.id}>
										{category.name}
									</option>
								))}
							</select>
						</label>

						{error ? <p className="text-sm text-red-700">{error}</p> : null}

						<button
							type="submit"
							disabled={submitting}
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
							{submitting ? 'Creating…' : 'Create category'}
						</button>
					</form>
				</section>
			) : null}

			<section className="flex flex-col gap-3">
				<h2 className="text-lg font-semibold">Existing categories</h2>
				{loading ? <p className="text-sm text-slate-500">Loading…</p> : null}
				{!loading && categories.length === 0 ? (
					<p className="text-sm text-slate-500">No categories yet.</p>
				) : null}
				{categories.map((category) => (
					<div
						key={category.id}
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
						"
					>
						<div className="flex flex-wrap items-center justify-between gap-2">
							<div>
								<p className="font-semibold">{category.name}</p>
								<p className="text-sm text-slate-600">{category.slug}</p>
							</div>
							<a
								href={`/shop/search?category=${encodeURIComponent(category.slug)}`}
								className="text-sm font-semibold text-sky hover:underline"
							>
								Browse products
							</a>
						</div>
						<p className="mt-2 text-xs text-slate-500">
							{category.parent ? `Parent: ${category.parent.name} · ` : ''}
							{category._count?.products ?? 0} products · {category._count?.children ?? 0}{' '}
							children
						</p>
					</div>
				))}
			</section>
		</div>
	);
}
