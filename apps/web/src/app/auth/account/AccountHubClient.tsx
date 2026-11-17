'use client';

import Link from 'next/link';
import {
	resolveOrdersToFulfillHref,
} from '../../../components/catalog/AccountMenu';
import { NavigateHoverArrow } from '../../../components/catalog/NavigateHoverArrow';
import type { VendorSummary } from '../../../lib/catalog-api';
import { NOTIFICATIONS_INBOX_PATH } from '../../../lib/notifications-api';
import { useSession } from '../../../lib/useSession';

type HubLink = {
	href: string;
	label: string;
};

function HubNavLink({ href, label }: HubLink) {
	return (
		<Link
			className="
				group
				flex
				items-center
				rounded-lg
				px-2
				py-2.5
				text-sm
				font-semibold
				text-ink
				transition
				hover:bg-white
			"
			href={href}
		>
			<span className="min-w-0 flex-1">
				{label}
			</span>
			<NavigateHoverArrow className="text-slate-400" />
		</Link>
	);
}

function HubSection({
	title,
	links,
}: {
	title?: string;
	links: HubLink[];
}) {
	if(links.length === 0) {
		return null;
	}

	return (
		<section>
			{title
				? (
					<h2
						className="
							mb-1
							px-2
							text-xs
							font-semibold
							uppercase
							tracking-wide
							text-slate-500
						"
					>
						{title}
					</h2>
				)
				: null
			}
			<nav
				className="
					flex
					flex-col
					gap-0.5
				"
			>
				{links.map((link) => (
					<HubNavLink
						key={link.href}
						href={link.href}
						label={link.label}
					/>
				))}
			</nav>
		</section>
	);
}

export function AccountHubClient({
	vendors,
}: {
	vendors: VendorSummary[];
}) {
	const { user, signOut } = useSession();

	if(!user) {
		return null;
	}

	const accountLinks: HubLink[] = [
		{
			href: '/auth/account/password',
			label: user.hasPassword
				? 'Password'
				: 'Add password',
		},
		{
			href: NOTIFICATIONS_INBOX_PATH,
			label: 'Notifications',
		},
		{
			href: '/place-et-marque/preferences',
			label: 'Preferences',
		},
		{
			href: '/place-et-marque/orders',
			label: 'Your orders',
		},
	];

	const sellLinks: HubLink[] = [
		{
			href: '/place-et-marque/vendors',
			label: vendors.length > 0
				? 'Vendors'
				: 'Create a vendor',
		},
	];

	if(vendors.length > 0) {
		sellLinks.push({
			href: '/place-et-marque/manage',
			label: 'Manage listings',
		});
		const fulfillHref = resolveOrdersToFulfillHref(
			'/auth/account',
			vendors,
		);
		if(fulfillHref) {
			sellLinks.push({
				href: fulfillHref,
				label: 'Orders to fulfill',
			});
		}
	}

	return (
		<div
			className="
				mx-auto
				w-full
				max-w-xl
			"
		>
			<header className="mb-8">
				<h1
					className="
						text-2xl
						font-semibold
						text-ink
					"
				>
					Account
				</h1>
				<p
					className="
						mt-1
						text-sm
						text-slate-600
					"
				>
					{user.email}
				</p>
			</header>

			<div
				className="
					flex
					flex-col
					gap-8
				"
			>
				<HubSection links={accountLinks} />
				<HubSection
					title="Sell"
					links={sellLinks}
				/>
			</div>

			<div
				className="
					mt-10
					flex
					justify-end
					border-t
					border-slate-200
					pt-6
				"
			>
				<button
					className="
						text-sm
						font-semibold
						text-slate-500
						transition
						hover:text-ink
					"
					type="button"
					onClick={() => {
						void signOut().then(() => {
							window.location.href = '/auth/login';
						});
					}}
				>
					Sign out
				</button>
			</div>
		</div>
	);
}
