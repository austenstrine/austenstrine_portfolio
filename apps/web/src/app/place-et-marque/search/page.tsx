'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import {
	listCatalogCategories,
	searchCatalogProducts,
	type CatalogProductSummary,
} from '../../../lib/catalog-api';
import { sortCategoryTree } from '../../../lib/category-tree';
import { formatQty } from '../../../lib/uom-qty';

function PlaceEtMarqueSearchForm() {
	const searchParams = useSearchParams();
	const [query, setQuery] = useState('');
	const [category, setCategory] = useState(searchParams.get('category') ?? '');
	const [vendor, setVendor] = useState(searchParams.get('vendor') ?? '');
	const [categories, setCategories] = useState<Array<{
		id: string;
		slug: string;
		name: string;
		parent?: { id: string; name: string; slug: string } | null;
	}>>([]);
	const categoryTree = sortCategoryTree(categories);
	const [results, setResults] = useState<CatalogProductSummary[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		listCatalogCategories()
			.then((rows) => setCategories(rows))
			.catch(() => undefined);
	}, []);

	useEffect(() => {
		setLoading(true);
		searchCatalogProducts({
			q: query || undefined,
			category: category || undefined,
			vendor: vendor || undefined,
		})
			.then(setResults)
			.catch(() => setResults([]))
			.finally(() => setLoading(false));
	}, [query, category, vendor]);

	return (
		<div
			className="
				flex
				flex-col
				gap-6
			"
		>
			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				Search catalog
			</h1>

			<div
				className="
					grid
					gap-4
					md:grid-cols-[1fr_240px]
				"
			>
				<input
					className="
						rounded-xl
						border
						border-slate-300
						px-4
						py-3
						text-sm
					"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="Search by title, SKU, or description"
				/>
				<select
					className="
						rounded-xl
						border
						border-slate-300
						px-4
						py-3
						text-sm
					"
					value={category}
					onChange={(event) => setCategory(event.target.value)}
				>
					<option value="">
						All categories
					</option>
					{categoryTree.map((row) => (
						<option
							key={row.slug}
							value={row.slug}
						>
							{row.label}
						</option>
					))}
				</select>
			</div>

			{vendor
				? (
					<p className="text-sm text-slate-600">
						Filtered to vendor{' '}
						<span className="font-semibold">
							{vendor}
						</span>
						.{' '}
						<button
							className="
								font-semibold
								text-sky
								hover:underline
							"
							type="button"
							onClick={() => setVendor('')}
						>
							Clear vendor filter
						</button>
					</p>
				)
				: null
			}

			{loading
				? (
					<p className="text-sm text-slate-500">
						Searching…
					</p>
				)
				: null
			}

			<div className="grid gap-3">
				{results.map((product) => (
					<a
						className="
							rounded-xl
							border
							border-slate-200
							bg-white
							p-4
							hover:border-sky
						"
						key={product.id}
						href={`/place-et-marque/${product.vendor.slug}/${product.slug}`}
					>
						<p className="font-semibold">
							{product.title}
						</p>
						<p className="text-sm text-slate-600">
							{product.sku} · {formatQty(product.availableQty, product.primaryUom)} available
						</p>
					</a>
				))}
			</div>
		</div>
	);
}

export default function PlaceEtMarqueSearchPage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading search…
				</p>
			}
		>
			<PlaceEtMarqueSearchForm />
		</Suspense>
	);
}
