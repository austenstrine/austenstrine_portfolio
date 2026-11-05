'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { ProductEditorForm } from '../../../../../components/catalog/ProductEditorForm';

function EditProductBySlugPageInner() {
	const params = useParams<{ vendorSlug: string; productSlug: string }>();

	return (
		<RequireAccess
			vendorRequired
			reasonKey="products"
		>
			<ProductEditorForm
				productEditorSurface="standard"
				productEditorIntent="edit"
				existingVendorSlug={params.vendorSlug}
				existingProductSlug={params.productSlug}
			/>
		</RequireAccess>
	);
}

export default function EditProductBySlugPage() {
	return (
		<Suspense fallback={null}>
			<EditProductBySlugPageInner />
		</Suspense>
	);
}
