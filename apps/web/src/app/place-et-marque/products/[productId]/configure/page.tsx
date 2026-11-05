import { redirect } from 'next/navigation';
import { ApiUnavailable } from '../../../../../components/ApiUnavailable';
import { getCatalogProductById } from '../../../../../lib/catalog-api';
import { productEditHref } from '../../../../../lib/vendor-ref';

type LegacyConfigureRedirectProps = {
	params: Promise<{ productId: string }>;
};

export default async function LegacyConfigureProductRedirectPage({
	params,
}: LegacyConfigureRedirectProps) {
	const { productId } = await params;
	let vendorSlug: string;
	let productSlug: string;
	try {
		const product = await getCatalogProductById(productId);
		vendorSlug = product.vendor.slug;
		productSlug = product.slug;
	}
	catch {
		return (
			<ApiUnavailable detail="This configure link loaded, but the product could not be found or the catalog API could not be reached." />
		);
	}

	// Must stay outside the load try/catch — Next.js redirect() throws.
	redirect(
		productEditHref(
			{
				vendorSlug,
				productSlug,
			},
			'advanced',
		),
	);
}
