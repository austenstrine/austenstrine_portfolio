'use client';

import Link from 'next/link';
import {
	resolveOrdersToFulfillHref,
} from '../../../../components/catalog/AccountMenu';
import { NavigateHoverArrow } from '../../../../components/catalog/NavigateHoverArrow';
import { NavigatePersistentArrow } from '../../../../components/catalog/NavigatePersistentArrow';
import { PILL_CTA_MOTION_CLASS } from '../../../../components/catalog/pillCta';
import {
	accessReason,
	buildLoginUrl,
	buildRegisterUrl,
	pemAuthPath,
} from '../../../../lib/accessGate';
import type { VendorSummary } from '../../../../lib/catalog-api';
import { NOTIFICATIONS_INBOX_PATH } from '../../../../lib/notifications-api';
import { useSession } from '../../../../lib/useSession';

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

function GuestAccountPrompt() {
	const next = pemAuthPath('/account');
	const reason = accessReason('account', false);
	const signInHref = buildLoginUrl({ next, reason });
	const registerHref = buildRegisterUrl({ next, reason });

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
					{reason}
				</p>
			</header>
			<div
				className="
					flex
					flex-wrap
					items-center
					gap-3
				"
			>
				<a
					className={`
						group
						inline-flex
						items-center
						gap-1.5
						rounded-full
						bg-sky
						px-5
						py-2.5
						text-sm
						font-semibold
						text-white
						${PILL_CTA_MOTION_CLASS}
						hover:bg-sky/90
					`}
					href={signInHref}
				>
					Sign in
					<NavigatePersistentArrow />
				</a>
				<a
					className={`
						group
						inline-flex
						items-center
						gap-1.5
						rounded-full
						border
						border-slate-300
						px-5
						py-2.5
						text-sm
						font-semibold
						text-ink
						${PILL_CTA_MOTION_CLASS}
						hover:border-sky
						hover:text-sky
					`}
					href={registerHref}
				>
					Create account
					<NavigatePersistentArrow />
				</a>
			</div>
		</div>
	);
}

function AccountHubBody({
	vendors,
}: {
	vendors: VendorSummary[];
}) {
	const { user, loading, signOut } = useSession();

	if(loading) {
		return (
			<p className="text-sm text-slate-500">
				Checking access…
			</p>
		);
	}

	if(!user) {
		return <GuestAccountPrompt />;
	}

	const accountLinks: HubLink[] = [
		{
			href: '/place-et-marque/auth/account/password',
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
			'/place-et-marque/auth/account',
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
							window.location.href = '/place-et-marque/auth/login';
						});
					}}
				>
					Sign out
				</button>
			</div>
		</div>
	);
}

export function AccountHubClient({
	vendors,
}: {
	vendors: VendorSummary[];
}) {
	return (
		<AccountHubBody vendors={vendors} />
	);
}
