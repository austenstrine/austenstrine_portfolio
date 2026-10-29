import { CatalogCover } from '../../components/catalog/CatalogCover';
import { CatalogEmptyActions } from '../../components/catalog/CatalogEmptyActions';
import { DemoIntro } from '../../components/catalog/DemoIntro';
import { searchCatalogProducts, type CatalogProductSummary } from '../../lib/catalog-api';
import { formatQty } from '../../lib/uom-qty';

export default async function PlaceEtMarqueHomePage() {
	let products: CatalogProductSummary[] = [];
	let loadFailed = false;
	try {
		products = (await searchCatalogProducts({})).items;
	}
	catch {
		loadFailed = true;
	}

	return (
		<div
			className="
				flex
				flex-col
				gap-8
			"
		>
			<DemoIntro />

			<div>
				<h2
					className="
						text-2xl
						font-semibold
						tracking-tight
					"
				>
					Catalog
				</h2>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Browse by vendor, or open a listing to see units and buying options.
				</p>
			</div>

			{products.length === 0
				? (
					<div
						className="
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
							grid
							gap-4
							md:grid-cols-2
						"
					>
						{products.map((product) => (
							<a
								className="
									rounded-2xl
									border
									border-slate-200
									bg-white
									p-5
									transition
									hover:border-sky
								"
								key={product.id}
								href={`/place-et-marque/${product.vendor.slug}/${product.slug}`}
							>
								<div className="mb-4 overflow-hidden rounded-xl bg-slate-100">
									<div className="relative aspect-[5/3]">
										<CatalogCover
											src={product.imageUrls?.[0]}
											alt={product.title}
											width={720}
											height={432}
											className="absolute inset-0 h-full w-full object-cover"
											fallback={
												<div className="flex h-full items-center justify-center text-sm font-semibold text-slate-400">
													{product.vendor.name}
												</div>
											}
										/>
									</div>
								</div>
								<p
									className="
										text-xs
										font-semibold
										uppercase
										tracking-wide
										text-slate-500
									"
								>
									{product.vendor.name}
								</p>
								<h2
									className="
										mt-1
										text-xl
										font-semibold
									"
								>
									{product.title}
								</h2>
								<p
									className="
										mt-2
										text-sm
										text-slate-600
									"
								>
									{product.description}
								</p>
								<p
									className="
										mt-4
										text-sm
										font-semibold
										text-ink
									"
								>
									From ${((product.primaryPriceCents ?? 0) / 100).toFixed(2)}
									{product.primaryUom
										? ` / ${product.primaryUom}`
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
									Available: {formatQty(product.availableQty, product.primaryUom)}
								</p>
							</a>
						))}
					</div>
				)
			}
		</div>
	);
}
