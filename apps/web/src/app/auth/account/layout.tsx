import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { CatalogHeader } from '../../../components/catalog/CatalogHeader';
import { CatalogSearchProvider } from '../../../components/catalog/CatalogSearchContext';
import { EditableVendorsProvider } from '../../../components/catalog/EditableVendorsProvider';
import { MarketplaceFooter } from '../../../components/catalog/MarketplaceFooter';
import { PardonOurDustBanner } from '../../../components/catalog/PardonOurDustBanner';
import { accessReason, buildLoginUrl } from '../../../lib/accessGate';
import { getCurrentUser, type AuthUser } from '../../../lib/auth-api';
import {
	listCatalogCategories,
	listMyVendors,
	type CatalogCategoryRow,
} from '../../../lib/catalog-api';
import { getCartCached } from '../../../lib/checkout-api.server';
import { SessionProvider } from '../../../lib/useSession';

const EDITOR_ROLES = new Set(['OWNER', 'EDITOR']);

function editableVendorIdsFromMine(
	vendors: Array<{ id: string; myRole: string }>,
): string[] {
	return vendors
		.filter((vendor) => EDITOR_ROLES.has(vendor.myRole))
		.map((vendor) => vendor.id);
}

export const metadata: Metadata = {
	title: 'Account',
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
	// Auth chrome before paint (PEM-373): never reserve-then-reveal Sign in / Account.
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

	if(!initialUser) {
		const jar = cookies();
		const hasAuthCookie = Boolean(
			jar.get('access_token')?.value
			|| jar.get('refresh_token')?.value,
		);
		// True guest (no cookies): one-shot SSR login. Cookie present but SSR
		// could not establish a user (stale access / legacy refresh path): let
		// the client probe recover — do not bounce account↔login.
		if(!hasAuthCookie) {
			redirect(
				buildLoginUrl({
					next: '/auth/account',
					reason: accessReason('account', false),
				}),
			);
		}
	}

	if(initialUser) {
		const [vendorsResult, cartResult] = await Promise.all([
			listMyVendors()
				.then((vendors) => ({ ok: true as const, vendors }))
				.catch(() => ({
					ok: false as const,
					vendors: [] as Awaited<ReturnType<typeof listMyVendors>>,
				})),
			getCartCached()
				.then((cart) => ({ ok: true as const, cart }))
				.catch(() => ({ ok: false as const, cart: null })),
		]);
		initialEditableVendorIds = editableVendorIdsFromMine(vendorsResult.vendors);
		if(cartResult.cart) {
			initialCartCount = cartResult.cart.lineCount ?? cartResult.cart.lines.length;
		}
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
			<SessionProvider initialUser={initialUser}>
				<CatalogSearchProvider initialCategories={initialCategories}>
					<EditableVendorsProvider initialEditableVendorIds={initialEditableVendorIds}>
						<PardonOurDustBanner />
						<CatalogHeader initialCartCount={initialCartCount} />
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
					</EditableVendorsProvider>
				</CatalogSearchProvider>
			</SessionProvider>
		</div>
	);
}
