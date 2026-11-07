import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApiUnavailable } from '../../../components/ApiUnavailable';
import { CatalogNotFound } from '../../../components/CatalogNotFound';
import {
	CatalogSearchExperience,
	ProductGridSkeleton,
} from '../../../components/catalog/CatalogSearchExperience';
import { VendorStorefrontProfile } from '../../../components/catalog/VendorStorefrontProfile';
import { isCatalogNotFound } from '../../../lib/catalog-api';
import { getPublicVendor } from '../../../lib/public-vendor-api';

type VendorPageProps = {
	params: Promise<{ vendorSlug: string }>;
};

export async function generateMetadata({ params }: VendorPageProps): Promise<Metadata> {
	try {
		const { vendorSlug } = await params;
		const vendor = await getPublicVendor(vendorSlug);
		return {
			title: vendor.name,
			description: vendor.tagline
				?? vendor.about
				?? `Shop ${vendor.name} on Place et Marque.`,
		};
	}
	catch {
		return {
			title: 'Seller',
		};
	}
}

export default async function VendorStorefrontPage({ params }: VendorPageProps) {
	const { vendorSlug } = await params;
	let vendor: Awaited<ReturnType<typeof getPublicVendor>>;
	try {
		vendor = await getPublicVendor(vendorSlug);
	}
	catch(error) {
		if(isCatalogNotFound(error)) {
			return (
				<CatalogNotFound
					title="Seller not found"
					detail="This seller is not in the catalog, or the link is out of date."
				/>
			);
		}
		return (
			<ApiUnavailable detail="This seller page loaded, but the catalog API could not be reached." />
		);
	}

	return (
		<div className="min-w-0">
			<VendorStorefrontProfile vendor={vendor} />
			<div className="mt-8">
				<Suspense
					fallback={
						<div className="-mx-gutter px-gutter">
							<div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
							<div className="mt-5 h-10 w-64 animate-pulse rounded bg-slate-200" />
							<div className="mt-8">
								<ProductGridSkeleton />
							</div>
						</div>
					}
				>
					<CatalogSearchExperience
						hideVendorIdentityChrome
						lockedVendor={{
							slug: vendor.slug,
							name: vendor.name,
						}}
					/>
				</Suspense>
			</div>
		</div>
	);
}
