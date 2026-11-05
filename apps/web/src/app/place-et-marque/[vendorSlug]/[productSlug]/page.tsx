import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { ApiUnavailable } from '../../../../components/ApiUnavailable';
import { ProductDetailClient } from '../../../../components/catalog/ProductDetailClient';
import {
	getCatalogProduct,
	searchCatalogProducts,
	type CatalogProductDetail,
	type CatalogProductSummary,
} from '../../../../lib/catalog-api';
import {
	productPathNeedsCanonicalRedirect,
	productViewHref,
} from '../../../../lib/vendor-ref';

type ProductPageProps = {
	params: Promise<{ vendorSlug: string; productSlug: string }>;
};

const loadProduct = cache(getCatalogProduct);

async function relatedProducts(product: CatalogProductDetail): Promise<CatalogProductSummary[]> {
	const seen = new Set([product.id]);
	const items: CatalogProductSummary[] = [];
	const queries: Array<{
		category?: string;
		vendor?: string;
		limit: number;
		inStock: boolean;
	}> = [];
	if(product.category) {
		queries.push({ category: product.category.slug, limit: 8, inStock: true });
	}
	queries.push({ vendor: product.vendor.slug, limit: 8, inStock: true });

	for(const query of queries) {
		if(items.length >= 6) {
			break;
		}
		const result = await searchCatalogProducts(query).catch(() => null);
		for(const row of result?.items ?? []) {
			if(seen.has(row.id)) {
				continue;
			}
			seen.add(row.id);
			items.push(row);
			if(items.length >= 6) {
				break;
			}
		}
	}

	return items;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
	try {
		const { vendorSlug, productSlug } = await params;
		const product = await loadProduct(vendorSlug, productSlug);
		return {
			title: product.title,
			description: product.description ?? `${product.title} from ${product.vendor.name}.`,
		};
	}
	catch {
		return {
			title: 'Product',
		};
	}
}

export default async function ProductPage({ params }: ProductPageProps) {
	const { vendorSlug, productSlug } = await params;
	let product: CatalogProductDetail;
	try {
		product = await loadProduct(vendorSlug, productSlug);
	}
	catch {
		return (
			<ApiUnavailable detail="This product page loaded, but the catalog API could not be reached." />
		);
	}

	const canonical = {
		vendorSlug: product.vendor.slug,
		productSlug: product.slug,
	};
	// Must stay outside the load try/catch — Next.js redirect() throws.
	if(
		productPathNeedsCanonicalRedirect(
			{ vendorSlug, productSlug },
			canonical,
		)
	) {
		redirect(productViewHref(canonical));
	}

	const related = await relatedProducts(product);
	return (
		<ProductDetailClient
			initialProduct={product}
			relatedProducts={related}
		/>
	);
}
