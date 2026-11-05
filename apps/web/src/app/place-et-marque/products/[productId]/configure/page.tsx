'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { getCatalogProductById } from '../../../../../lib/catalog-api';
import { productEditHref } from '../../../../../lib/vendor-ref';

function LegacyConfigureProductRedirectInner() {
	const params = useParams<{ productId: string }>();
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const productId = params.productId;
		if(!productId) {
			return;
		}
		let cancelled = false;
		getCatalogProductById(productId)
			.then((product) => {
				if(cancelled) {
					return;
				}
				router.replace(
					productEditHref(
						{
							vendorSlug: product.vendor.slug,
							productSlug: product.slug,
						},
						'advanced',
					),
				);
			})
			.catch(() => {
				if(!cancelled) {
					setError('Could not open that product.');
				}
			});
		return () => {
			cancelled = true;
		};
	}, [params.productId, router]);

	if(error) {
		return (
			<p className="px-4 py-10 text-sm text-rose-700">
				{error}
			</p>
		);
	}

	return (
		<p className="px-4 py-10 text-sm text-slate-500">
			Opening product…
		</p>
	);
}

export default function LegacyConfigureProductRedirectPage() {
	return (
		<RequireAccess
			vendorRequired
			reasonKey="products"
		>
			<Suspense fallback={null}>
				<LegacyConfigureProductRedirectInner />
			</Suspense>
		</RequireAccess>
	);
}
