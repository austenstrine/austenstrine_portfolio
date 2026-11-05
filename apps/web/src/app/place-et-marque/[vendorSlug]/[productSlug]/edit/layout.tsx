import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
	absolutePageTitle,
	resolveProductEditTitleBySlug,
} from '../../../../../lib/place-et-marque-meta';

type EditBySlugLayoutProps = {
	children: ReactNode;
	params: Promise<{ vendorSlug: string; productSlug: string }>;
};

export async function generateMetadata({
	params,
}: EditBySlugLayoutProps): Promise<Metadata> {
	const { vendorSlug, productSlug } = await params;
	return {
		title: {
			absolute: absolutePageTitle(
				await resolveProductEditTitleBySlug(vendorSlug, productSlug),
			),
		},
	};
}

export default function EditProductBySlugLayout({
	children,
}: EditBySlugLayoutProps) {
	return children;
}
