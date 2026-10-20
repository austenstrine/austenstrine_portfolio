import { searchCatalogProducts } from '../../lib/catalog-api';

export default async function ShopHomePage() {
	const products = await searchCatalogProducts({}).catch(() => []);

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
					Catalog
				</h1>
				<p
					className="
						mt-2
						max-w-2xl
						text-slate-600
					"
				>
					Products with flexible units, pack/piece pairs, broken-pack remainders, and cached
					availability for fast search.
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
							No products yet
						</p>
						<p
							className="
								mt-2
								text-sm
								text-slate-600
							"
						>
							No seed data—create a vendor, add units and categories, then list a product.
						</p>
						<div
							className="
								mt-4
								flex
								flex-wrap
								gap-3
							"
						>
							<a
								className="
									inline-flex
									rounded-full
									bg-ink
									px-4
									py-2
									text-sm
									font-semibold
									text-white
									hover:bg-sky
								"
								href="/shop/vendors"
							>
								Create a vendor
							</a>
							<a
								className="
									inline-flex
									rounded-full
									border
									border-slate-300
									px-4
									py-2
									text-sm
									font-semibold
									text-ink
									hover:border-sky
									hover:text-sky
								"
								href="/shop/products/new"
							>
								New product
							</a>
						</div>
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
								href={`/shop/${product.vendor.slug}/${product.slug}`}
							>
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
									Available: {product.availableQty} {product.primaryUom ?? ''}
								</p>
							</a>
						))}
					</div>
				)
			}
		</div>
	);
}
