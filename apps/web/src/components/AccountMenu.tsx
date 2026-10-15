"use client";

import { useSession } from '../lib/useSession';

export function AccountMenu() {
	const { user, loading, signOut } = useSession();

	if (loading) {
		return null;
	}

	if (!user) {
		return (
			<a
				href="/auth/login"
				className="
					absolute
					right-4
					top-4
					rounded-full
					border
					border-white/25
					bg-white/10
					px-4
					py-2
					text-xs
					font-semibold
					text-white
					transition
					hover:bg-white/20
				"
			>
				Sign in
			</a>
		);
	}

	return (
		<div
			className="
				absolute
				right-4
				top-4
				flex
				items-center
				gap-2
				rounded-full
				border
				border-white/25
				bg-white/10
				px-3
				py-1.5
				text-xs
				font-semibold
				text-white
			"
		>
			<span className="max-w-[10rem] truncate">
				{user.email}
			</span>
			<button
				type="button"
				onClick={() => void signOut()}
				className="
					rounded-full
					bg-white/15
					px-2.5
					py-1
					transition
					hover:bg-white/25
				"
			>
				Sign out
			</button>
		</div>
	);
}
