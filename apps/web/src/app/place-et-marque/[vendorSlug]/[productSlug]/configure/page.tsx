'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { ProductEditorForm } from '../../../../../components/catalog/ProductEditorForm';

function ConfigureProductBySlugPageInner() {
	const params = useParams<{ vendorSlug: string; productSlug: string }>();

	return (
		<RequireAccess
			vendorRequired
			reasonKey="products"
		>
			<ProductEditorForm
				productEditorSurface="advanced"
				productEditorIntent="edit"
				existingVendorSlug={params.vendorSlug}
				existingProductSlug={params.productSlug}
			/>
		</RequireAccess>
	);
}

export default function ConfigureProductBySlugPage() {
	return (
		<Suspense fallback={null}>
			<ConfigureProductBySlugPageInner />
		</Suspense>
	);
}
