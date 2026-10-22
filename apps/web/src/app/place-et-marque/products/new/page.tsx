'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RequireAccess } from '../../../../components/auth/RequireAccess';
import { ProductEditorForm } from '../../../../components/catalog/ProductEditorForm';

function NewProductPageInner() {
	const searchParams = useSearchParams();

	return (
		<RequireAccess vendorRequired>
			<ProductEditorForm
				productEditorSurface="standard"
				productEditorIntent="create"
				initialVendorId={searchParams.get('vendorId') ?? ''}
				initialCategoryId={searchParams.get('categoryId') ?? ''}
			/>
		</RequireAccess>
	);
}

export default function NewProductPage() {
	return (
		<Suspense fallback={null}>
			<NewProductPageInner />
		</Suspense>
	);
}
