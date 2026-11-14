'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { AuthCard } from '../../../components/auth/AuthCard';
import { RequireAccess } from '../../../components/auth/RequireAccess';
import { NavigateHoverArrow } from '../../../components/catalog/NavigateHoverArrow';
import { useSession } from '../../../lib/useSession';

const hubLinks = [
	{ href: '/auth/account/password', label: 'Password' },
	{ href: '/place-et-marque/preferences', label: 'Preferences' },
];

function AccountHub() {
	const { user, loading, signOut } = useSession();

	if(loading || !user) {
		return (
			<p className="text-sm text-slate-500">
				Loading account…
			</p>
		);
	}

	return (
		<AuthCard
			title="Account"
		>
			<p
				className="
					mb-6
					text-sm
					text-ink
				"
			>
				{user.email}
			</p>
			<nav
				className="
					flex
					flex-col
					gap-1
				"
			>
				{hubLinks.map((link) => (
					<Link
						key={link.href}
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
							hover:bg-frost
						"
						href={link.href}
					>
						<span className="min-w-0 flex-1">
							{link.label}
						</span>
						<NavigateHoverArrow className="text-slate-400" />
					</Link>
				))}
			</nav>
			<div
				className="
					mt-6
					flex
					justify-end
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
		</AuthCard>
	);
}

export default function AccountPage() {
	return (
		<main
			className="
				flex
				min-h-screen
				items-center
				justify-center
				bg-frost
				px-6
				py-16
			"
		>
			<Suspense fallback={null}>
				<RequireAccess
					reasonKey="account"
				>
					<AccountHub />
				</RequireAccess>
			</Suspense>
		</main>
	);
}
