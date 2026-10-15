import { ProductDetailClient } from '../../../../components/catalog/ProductDetailClient';
import { getCatalogProduct } from '../../../../lib/catalog-api';

type ProductPageProps = {
	params: Promise<{ vendorSlug: string; productSlug: string }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
	const { vendorSlug, productSlug } = await params;
	const product = await getCatalogProduct(vendorSlug, productSlug);

	return <ProductDetailClient initialProduct={product} />;
}
