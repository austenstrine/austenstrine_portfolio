import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { CatalogSearchProvider } from '../../components/catalog/CatalogSearchContext';
import { JumpToTop } from '../../components/catalog/JumpToTop';
import { MarketplaceFooter } from '../../components/catalog/MarketplaceFooter';
import { PardonOurDustBanner } from '../../components/catalog/PardonOurDustBanner';
import { SellerPageActionPane } from '../../components/catalog/SellerPageActionPane';
import { WidgetPrefsProvider } from '../../components/catalog/WidgetPrefsProvider';

export const metadata: Metadata = {
	title: 'Place et Marque',
	description:
		'A live multi-vendor catalog by Austen Strine. Browse and search without an account. Sign in to use cart and checkout.',
};

export default function PlaceEtMarqueLayout({ children }: { children: ReactNode }) {
	return (
		<div
			className="
				flex
				min-h-screen
				flex-col
				bg-frost
				text-ink
			"
		>
			<CatalogSearchProvider>
				<WidgetPrefsProvider>
					<PardonOurDustBanner />
					<CatalogHeader />
					{/* Fixed chrome early in DOM so page actions are reachable by Tab before the product grid. */}
					<SellerPageActionPane />
					<JumpToTop />
					<main
						className="
							mx-auto
							w-full
							max-w-7xl
							flex-1
							px-gutter
							py-6
							md:py-8
						"
					>
						{children}
					</main>
					<MarketplaceFooter />
				</WidgetPrefsProvider>
			</CatalogSearchProvider>
		</div>
	);
}
