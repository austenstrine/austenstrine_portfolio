'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAccess } from '../../../../components/auth/RequireAccess';
import { ProductEditorForm } from '../../../../components/catalog/ProductEditorForm';

function AdvancedNewProductPageInner() {
	const searchParams = useSearchParams();

	return (
		<RequireAccess vendorRequired>
			<ProductEditorForm
				productEditorSurface="advanced"
				productEditorIntent="create"
				initialVendorId={searchParams.get('vendorId') ?? ''}
				initialCategoryId={searchParams.get('categoryId') ?? ''}
			/>
		</RequireAccess>
	);
}

export default function AdvancedNewProductPage() {
	return (
		<Suspense fallback={null}>
			<AdvancedNewProductPageInner />
		</Suspense>
	);
}
