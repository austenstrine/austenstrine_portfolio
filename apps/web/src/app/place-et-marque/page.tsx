import { CatalogEmptyActions } from '../../components/catalog/CatalogEmptyActions';
import { DemoIntro } from '../../components/catalog/DemoIntro';
import { ProductCard } from '../../components/catalog/ProductCard';
import {
	listCatalogCategories,
	searchCatalogProducts,
	type CatalogCategoryRow,
	type CatalogProductSummary,
	type CatalogTermFacet,
} from '../../lib/catalog-api';
import { sortCategoryTree } from '../../lib/category-tree';
import { ArrowRightIcon } from '../../components/icons/ArrowRightIcon';

function titleCaseSlug(slug: string) {
	return slug
		.split(/[-_]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(' ');
}

export default async function PlaceEtMarqueHomePage() {
	let products: CatalogProductSummary[] = [];
	let departments: CatalogCategoryRow[] = [];
	let vendors: CatalogTermFacet[] = [];
	let total = 0;
	let loadFailed = false;
	try {
		const [catalog, categories] = await Promise.all([
			searchCatalogProducts({ limit: 16 }),
			listCatalogCategories(),
		]);
		products = catalog.items;
		total = catalog.total ?? catalog.items.length;
		vendors = catalog.vendorFacets ?? [];
		departments = sortCategoryTree(categories)
			.filter((row) => row.depth === 0)
			.slice(0, 12);
	}
	catch {
		loadFailed = true;
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-10
			"
		>
			<DemoIntro />

			{departments.length > 0
				? (
					<section>
						<div
							className="
								flex
								flex-col
								gap-2
								sm:flex-row
								sm:items-end
								sm:justify-between
							"
						>
							<div>
								<h2
									className="
										text-2xl
										font-semibold
										tracking-tight
									"
								>
									Shop by department
								</h2>
								<p
									className="
										mt-1
										text-sm
										text-slate-600
									"
								>
									Jump into a category instead of scrolling the whole catalog.
								</p>
							</div>
							<a
								className="
									inline-flex
									items-center
									gap-1
									text-sm
									font-semibold
									text-ink
									hover:underline
								"
								href="/place-et-marque/search"
							>
								All departments
								<ArrowRightIcon className="h-3.5 w-3.5" />
							</a>
						</div>
						<div
							className="
								mt-5
								grid
								grid-cols-2
								gap-3
								sm:grid-cols-3
								lg:grid-cols-4
								xl:grid-cols-6
							"
						>
							{departments.map((row) => (
								<a
									className="
										rounded-2xl
										border
										border-slate-200
										bg-white
										px-4
										py-4
										transition
										hover:border-ink/20
										hover:shadow-[0_8px_24px_rgba(13,27,42,0.06)]
									"
									href={`/place-et-marque/search?category=${encodeURIComponent(row.slug)}`}
									key={row.id}
								>
									<p
										className="
											text-sm
											font-semibold
											text-ink
										"
									>
										{row.name}
									</p>
									{row._count?.products
										? (
											<p
												className="
													mt-1
													text-[12px]
													text-slate-500
												"
											>
												{row._count.products.toLocaleString()} product
												{row._count.products === 1 ? '' : 's'}
											</p>
										)
										: null
									}
								</a>
							))}
						</div>
					</section>
				)
				: null
			}

			{vendors.length > 1
				? (
					<section>
						<h2
							className="
								text-2xl
								font-semibold
								tracking-tight
							"
						>
							Shop by seller
						</h2>
						<div
							className="
								mt-5
								flex
								flex-wrap
								gap-2
							"
						>
							{vendors.map((row) => (
								<a
									className="
										rounded-full
										border
										border-slate-200
										bg-white
										px-4
										py-2
										text-sm
										font-semibold
										text-ink
										hover:border-ink/30
									"
									href={`/place-et-marque/search?vendor=${encodeURIComponent(row.slug)}`}
									key={row.slug}
								>
									{titleCaseSlug(row.slug)}
									<span
										className="
											ml-2
											text-[12px]
											font-medium
											text-slate-500
										"
									>
										{row.count.toLocaleString()}
									</span>
								</a>
							))}
						</div>
					</section>
				)
				: null
			}

			<section>
				<div
					className="
						flex
						flex-col
						gap-2
						sm:flex-row
						sm:items-end
						sm:justify-between
					"
				>
					<div>
						<h2
							className="
								text-2xl
								font-semibold
								tracking-tight
							"
						>
							Shop the store
						</h2>
						<p
							className="
								mt-1
								text-sm
								text-slate-600
							"
						>
							{loadFailed
								? 'The catalog could not be loaded.'
								: total > 0
									? `${total.toLocaleString()} product${total === 1 ? '' : 's'} from live inventory.`
									: 'No products in the index yet.'
							}
						</p>
					</div>
					{products.length > 0
						? (
							<a
								className="
									inline-flex
									items-center
									gap-1
									text-sm
									font-semibold
									text-ink
									hover:underline
								"
								href="/place-et-marque/search"
							>
								View all
								<ArrowRightIcon className="h-3.5 w-3.5" />
							</a>
						)
						: null
					}
				</div>

				{products.length === 0
					? (
						<div
							className="
								mt-5
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-6
							"
						>
							<p className="font-semibold text-ink">
								{loadFailed
									? 'Could not load the catalog'
									: 'No products in the index'
								}
							</p>
							<p
								className="
									mt-2
									text-sm
									text-slate-600
								"
							>
								{loadFailed
									? 'The API or search index did not respond. That is a real outage, not an empty store.'
									: 'Seed data may not have been applied, or search has nothing to return.'
								}
							</p>
							{loadFailed
								? null
								: <CatalogEmptyActions />
							}
						</div>
					)
					: (
						<div
							className="
								mt-5
								grid
								grid-cols-2
								gap-3
								sm:gap-5
								lg:grid-cols-3
								xl:grid-cols-4
							"
						>
							{products.map((product) => (
								<ProductCard
									key={product.id}
									product={product}
								/>
							))}
						</div>
					)
				}
			</section>
		</div>
	);
}
