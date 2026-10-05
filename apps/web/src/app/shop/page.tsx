import { searchCatalogProducts } from '../../lib/catalog-api';

export default async function ShopHomePage() {
	const products = await searchCatalogProducts({}).catch(() => []);

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-3xl font-semibold tracking-tight">Catalog</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					Products with flexible units, pack/piece pairs, broken-pack remainders, and cached
					availability for fast search.
				</p>
			</div>

			{products.length === 0 ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-6">
					<p className="font-semibold text-ink">No products yet</p>
					<p className="mt-2 text-sm text-slate-600">
						This app does not rely on seed data. Start the walkthrough to create a vendor,
						UOMs, category, and your first pack/piece product.
					</p>
					<a
						href="/shop/start"
						className="
							mt-4
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
					>
						Start walkthrough
					</a>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2">
					{products.map((product) => (
						<a
							key={product.id}
							href={`/shop/${product.vendor.slug}/${product.slug}`}
							className="
								rounded-2xl
								border
								border-slate-200
								bg-white
								p-5
								transition
								hover:border-sky
							"
						>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								{product.vendor.name}
							</p>
							<h2 className="mt-1 text-xl font-semibold">{product.title}</h2>
							<p className="mt-2 text-sm text-slate-600">{product.description}</p>
							<p className="mt-4 text-sm font-semibold text-ink">
								From ${((product.primaryPriceCents ?? 0) / 100).toFixed(2)}
								{product.primaryUom ? ` / ${product.primaryUom}` : ''}
							</p>
							<p className="mt-1 text-xs text-slate-500">
								Available: {product.availableQty} {product.primaryUom ?? ''}
							</p>
						</a>
					))}
				</div>
			)}
		</div>
	);
}
