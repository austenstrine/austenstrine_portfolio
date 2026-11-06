import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ApiUnavailable } from '../../../components/ApiUnavailable';
import { CatalogNotFound } from '../../../components/CatalogNotFound';
import { CatalogSearchExperience } from '../../../components/catalog/CatalogSearchExperience';
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
			description: `Shop ${vendor.name} on Place et Marque.`,
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
		<Suspense
			fallback={
				<div className="-mx-gutter px-gutter">
					<div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
					<div className="mt-5 h-10 w-64 animate-pulse rounded bg-slate-200" />
					<div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
						{Array.from({ length: 9 }).map((_, index) => (
							<div
								className="aspect-square animate-pulse rounded-2xl bg-slate-200"
								key={index}
							/>
						))}
					</div>
				</div>
			}
		>
			<CatalogSearchExperience
				lockedVendor={{
					slug: vendor.slug,
					name: vendor.name,
				}}
			/>
		</Suspense>
	);
}
