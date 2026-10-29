import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';

export const metadata: Metadata = {
	title: 'Place et Marque',
	description:
		'A live multi-vendor catalog by Austen Strine. Browse and search without an account. Sign in to use cart and checkout.',
};

export default function PlaceEtMarqueLayout({ children }: { children: ReactNode }) {
	return (
		<div
			className="
				min-h-screen
				bg-frost
				text-ink
			"
		>
			<CatalogHeader />
			<main
				className="
					mx-auto
					max-w-6xl
					px-6
					py-10
				"
			>
				{children}
			</main>
		</div>
	);
}
