import { CatalogEmptyActions } from '../../components/catalog/CatalogEmptyActions';
import {
	CATEGORY_BENTO_VARIANTS,
	CategoryCard,
	nestedCategoryImages,
} from '../../components/catalog/CategoryCard';
import { DemoIntro } from '../../components/catalog/DemoIntro';
import { ProductCard } from '../../components/catalog/ProductCard';
import {
	listCatalogCategories,
	searchCatalogProducts,
	type CatalogCategoryRow,
	type CatalogProductSummary,
	type CatalogTermFacet,
} from '../../lib/catalog-api';
import { nestCategoryTree, type NestedCategory } from '../../lib/category-tree';
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
	let departments: NestedCategory<CatalogCategoryRow>[] = [];
	let nestedProducts: CatalogProductSummary[][] = [];
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
		departments = nestCategoryTree(categories).slice(0, 12);
		nestedProducts = await Promise.all(
			departments.map((row, index) => {
				const variant = CATEGORY_BENTO_VARIANTS[index] ?? 'compact';
				if(variant === 'compact') {
					return Promise.resolve([] as CatalogProductSummary[]);
				}
				return searchCatalogProducts({ category: row.slug, limit: 4 })
					.then((result) => result.items)
					.catch(() => [] as CatalogProductSummary[]);
			}),
		);
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
									Shop by category
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
								All categories
								<ArrowRightIcon className="h-3.5 w-3.5" />
							</a>
						</div>
						<div
							className="
								mt-5
								grid
								grid-cols-2
								gap-3
								sm:gap-5
								lg:grid-cols-4
								lg:auto-rows-[minmax(12.5rem,auto)]
							"
						>
							{departments.map((row, index) => {
								const variant = CATEGORY_BENTO_VARIANTS[index] ?? 'compact';
								return (
									<CategoryCard
										category={row}
										key={row.id}
										nested={
											nestedCategoryImages(
												row,
												nestedProducts[index] ?? [],
												variant,
											)
										}
										variant={variant}
									/>
								);
							})}
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
									href={`/place-et-marque/${encodeURIComponent(row.slug)}`}
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
									? 'The API or search index did not respond. This is an outage.'
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
