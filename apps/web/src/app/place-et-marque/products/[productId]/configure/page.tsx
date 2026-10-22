'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { RequireAccess } from '../../../../../components/auth/RequireAccess';
import { ProductEditorForm } from '../../../../../components/catalog/ProductEditorForm';

function AdvancedEditProductPageInner() {
	const params = useParams<{ productId: string }>();
	const productId = params.productId;

	return (
		<RequireAccess vendorRequired>
			<ProductEditorForm
				productEditorSurface="advanced"
				productEditorIntent="edit"
				existingProductId={productId}
			/>
		</RequireAccess>
	);
}

export default function AdvancedEditProductPage() {
	return (
		<Suspense fallback={null}>
			<AdvancedEditProductPageInner />
		</Suspense>
	);
}