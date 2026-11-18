import type { Metadata } from 'next';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { AuthGuestChrome } from '../../components/auth/AuthGuestChrome';
import { CatalogHeader } from '../../components/catalog/CatalogHeader';
import { CatalogSearchProvider } from '../../components/catalog/CatalogSearchContext';
import { EditableVendorsProvider } from '../../components/catalog/EditableVendorsProvider';
import { InPlacePageSaveBar } from '../../components/catalog/InPlaceProductFields';
import { JumpToTop } from '../../components/catalog/JumpToTop';
import { MarketplaceFooter } from '../../components/catalog/MarketplaceFooter';
import { PardonOurDustBanner } from '../../components/catalog/PardonOurDustBanner';
import { SellerPageActionPane } from '../../components/catalog/SellerPageActionPane';
import { WidgetPrefsProvider } from '../../components/catalog/WidgetPrefsProvider';
import { pathIsPemAuthGuest } from '../../lib/accessGate';
import { getCurrentUser, type AuthUser } from '../../lib/auth-api';
import {
	listCatalogCategories,
	listMyVendors,
	type CatalogCategoryRow,
} from '../../lib/catalog-api';
import { getCartCached } from '../../lib/checkout-api.server';
import { PLACE_ET_MARQUE_NAME } from '../../lib/place-et-marque-meta';
import { SessionProvider } from '../../lib/useSession';

const EDITOR_ROLES = new Set(['OWNER', 'EDITOR']);

function editableVendorIdsFromMine(
	vendors: Array<{ id: string; myRole: string }>,
): string[] {
	return vendors
		.filter((vendor) => EDITOR_ROLES.has(vendor.myRole))
		.map((vendor) => vendor.id);
}

export const metadata: Metadata = {
	title: {
		absolute: PLACE_ET_MARQUE_NAME,
		template: `%s · ${PLACE_ET_MARQUE_NAME}`,
	},
	description:
		'A live multi-vendor catalog by Austen Strine. Browse and search without an account. Sign in to use cart and checkout.',
};

export default async function PlaceEtMarqueLayout({ children }: { children: ReactNode }) {
	const pathname = headers().get('x-pathname') ?? '';
	// Guest auth under /place-et-marque/auth/* must NOT mount the shop
	// SessionProvider with a guest SSR seed — that is what killed post-login
	// soft nav (PEM-505/514). Cookies + hard remount into shop are authoritative.
	if(pathIsPemAuthGuest(pathname)) {
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
				<AuthGuestChrome />
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
			</div>
		);
	}

	// Decide category bar + auth/role header chrome before first paint (PEM-370/373).
	// Slower HTML is OK; never reserve-then-reveal Sign in / Account / Edit / cart.
	let initialCategories: CatalogCategoryRow[] = [];
	let initialUser: AuthUser | null = null;
	let initialEditableVendorIds: string[] = [];
	let initialCartCount = 0;

	const [categoriesResult, userResult] = await Promise.all([
		listCatalogCategories()
			.then((rows) => ({ ok: true as const, rows }))
			.catch(() => ({ ok: false as const, rows: [] as CatalogCategoryRow[] })),
		getCurrentUser()
			.then((user) => ({ ok: true as const, user }))
			.catch(() => ({ ok: false as const, user: null as AuthUser | null })),
	]);
	initialCategories = categoriesResult.rows;
	initialUser = userResult.user;

	if(initialUser) {
		const [vendorsResult, cartResult] = await Promise.all([
			listMyVendors()
				.then((vendors) => ({ ok: true as const, vendors }))
				.catch(() => ({ ok: false as const, vendors: [] as Awaited<ReturnType<typeof listMyVendors>> })),
			getCartCached()
				.then((cart) => ({ ok: true as const, cart }))
				.catch(() => ({ ok: false as const, cart: null })),
		]);
		initialEditableVendorIds = editableVendorIdsFromMine(vendorsResult.vendors);
		if(cartResult.cart) {
			initialCartCount = cartResult.cart.lineCount ?? cartResult.cart.lines.length;
		}
	}

	const sessionKey = initialUser?.id ?? 'guest';

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
			<SessionProvider
				key={sessionKey}
				initialUser={initialUser}
			>
				<CatalogSearchProvider initialCategories={initialCategories}>
					<EditableVendorsProvider initialEditableVendorIds={initialEditableVendorIds}>
						<WidgetPrefsProvider>
							<PardonOurDustBanner />
							<CatalogHeader initialCartCount={initialCartCount} />
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
			</SessionProvider>
		</div>
	);
}
