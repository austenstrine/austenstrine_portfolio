'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { resolvePostAuthDestination, safeNextPath } from './accessGate';
import { useSession } from './useSession';

/**
 * When a session already exists, leave guest auth pages (login/register)
 * for `next` — same idea as Linear/Notes not showing Sign in while signed in.
 */
export function useRedirectIfAuthenticated(nextRaw: string | null | undefined) {
	const router = useRouter();
	const { user, loading } = useSession();
	const nextPath = safeNextPath(nextRaw);

	useEffect(() => {
		if(loading || !user) {
			return;
		}
		let cancelled = false;
		void resolvePostAuthDestination(nextPath).then((destination) => {
			if(!cancelled) {
				router.replace(destination);
			}
		});
		return () => {
			cancelled = true;
		};
	}, [loading, user, nextPath, router]);

	return {
		user,
		loading,
		redirecting: Boolean(user) && !loading,
	};
}
