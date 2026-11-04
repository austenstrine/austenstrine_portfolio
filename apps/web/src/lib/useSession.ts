'use client';

import { useCallback, useEffect, useState } from 'react';
import {
	type AuthUser,
	logoutUser,
	probeCurrentUser,
} from './auth-api';

export function useSession() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);
	const [sessionUnavailable, setSessionUnavailable] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		setLoading(true);
		const probe = await probeCurrentUser();
		if(probe.status === 'ok') {
			setUser(probe.user);
			setSessionUnavailable(null);
		}
		else if(probe.status === 'unauthenticated') {
			setUser(null);
			setSessionUnavailable(null);
		}
		else {
			// Keep the last known user on a blip so seller pages do not bounce to Sign in.
			setSessionUnavailable(probe.message);
		}
		setLoading(false);
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const signOut = useCallback(async () => {
		await logoutUser().catch(() => undefined);
		setUser(null);
		setSessionUnavailable(null);
	}, []);

	return { user, loading, refresh, signOut, sessionUnavailable };
}
