'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { ProductEditorForm } from '../../../../../components/catalog/ProductEditorForm';

function EditProductPageInner() {
	const params = useParams<{ productId: string }>();
	const productId = params.productId;

	return (
		<RequireAccess vendorRequired>
			<ProductEditorForm
				productEditorSurface="standard"
				productEditorIntent="edit"
				existingProductId={productId}
			/>
		</RequireAccess>
	);
}

export default function EditProductPage() {
	return (
		<Suspense fallback={null}>
			<EditProductPageInner />
		</Suspense>
	);
}
