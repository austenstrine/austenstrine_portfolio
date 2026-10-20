'use client';

import { useSession } from '../../lib/useSession';

export function SessionNav() {
	const { user, loading, signOut } = useSession();

	if(loading) {
		return null;
	}

	if(!user) {
		return (
			<a
				className="text-sky hover:underline"
				href="/auth/login"
			>
				Sign in
			</a>
		);
	}

	return (
		<span
			className="
				flex
				flex-wrap
				items-center
				gap-3
			"
		>
			<a
				className="text-sky hover:underline"
				href="/auth/account"
			>
				Account
			</a>
			<button
				className="
					text-slate-500
					hover:text-ink
				"
				type="button"
				onClick={() => {
					void signOut().then(() => {
						window.location.reload();
					});
				}}
			>
				Sign out
			</button>
		</span>
	);
}