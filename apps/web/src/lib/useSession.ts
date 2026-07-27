"use client";

import { useCallback, useEffect, useState } from 'react';
import { type AuthUser, getCurrentUser, logoutUser } from './auth-api';

export function useSession() {
	const [user, setUser] = useState<AuthUser | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		const currentUser = await getCurrentUser();
		setUser(currentUser);
		setLoading(false);
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const signOut = useCallback(async () => {
		await logoutUser().catch(() => undefined);
		setUser(null);
	}, []);

	return { user, loading, refresh, signOut };
}
