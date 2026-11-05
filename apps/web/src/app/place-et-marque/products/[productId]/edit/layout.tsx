import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
	absolutePageTitle,
	resolveProductEditTitle,
} from '../../../../../lib/place-et-marque-meta';

type EditLayoutProps = {
	children: ReactNode;
	params: Promise<{ productId: string }>;
};

export async function generateMetadata({ params }: EditLayoutProps): Promise<Metadata> {
	const { productId } = await params;
	return {
		title: {
			absolute: absolutePageTitle(await resolveProductEditTitle(productId)),
		},
	};
}

export default function EditProductLayout({ children }: EditLayoutProps) {
	return children;
}
