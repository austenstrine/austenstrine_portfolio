import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { CatalogSearchProvider } from '../../components/catalog/CatalogSearchContext';
import { EditableVendorsProvider } from '../../components/catalog/EditableVendorsProvider';
import { InPlacePageSaveBar } from '../../components/catalog/InPlaceProductFields';
import { JumpToTop } from '../../components/catalog/JumpToTop';
import { MarketplaceFooter } from '../../components/catalog/MarketplaceFooter';
import { PardonOurDustBanner } from '../../components/catalog/PardonOurDustBanner';
import { SellerPageActionPane } from '../../components/catalog/SellerPageActionPane';
import { WidgetPrefsProvider } from '../../components/catalog/WidgetPrefsProvider';
import {
	listCatalogCategories,
	type CatalogCategoryRow,
} from '../../lib/catalog-api';
import { PLACE_ET_MARQUE_NAME } from '../../lib/place-et-marque-meta';

export const metadata: Metadata = {
	title: {
		absolute: PLACE_ET_MARQUE_NAME,
		template: `%s · ${PLACE_ET_MARQUE_NAME}`,
	},
	description:
		'A live multi-vendor catalog by Austen Strine. Browse and search without an account. Sign in to use cart and checkout.',
};

export default async function PlaceEtMarqueLayout({ children }: { children: ReactNode }) {
	// Decide CatalogCategoryBar presence before first paint (PEM-370). Slower
	// HTML is OK; never reserve-then-reveal after client fetch.
	let initialCategories: CatalogCategoryRow[] = [];
	try {
		initialCategories = await listCatalogCategories();
	}
	catch {
		initialCategories = [];
	}

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
			<CatalogSearchProvider initialCategories={initialCategories}>
				<EditableVendorsProvider>
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
						<InPlacePageSaveBar />
						<MarketplaceFooter />
					</WidgetPrefsProvider>
				</EditableVendorsProvider>
			</CatalogSearchProvider>
		</div>
	);
}
