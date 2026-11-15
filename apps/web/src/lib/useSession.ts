'use client';

import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useEffect,
	useState,
	type ReactNode,
} from 'react';
import {
	type AuthUser,
	logoutUser,
	probeCurrentUser,
} from './auth-api';

export type SessionValue = {
	user: AuthUser | null;
	loading: boolean;
	refresh: () => Promise<void>;
	signOut: () => Promise<void>;
	sessionUnavailable: string | null;
};

const SessionContext = createContext<SessionValue | null>(null);

function useSessionController(options: {
	enabled: boolean;
	/** When true, first paint already knows signed-in vs guest (PEM-373). */
	seeded: boolean;
	initialUser?: AuthUser | null;
}): SessionValue {
	const { enabled, seeded, initialUser = null } = options;
	const [user, setUser] = useState<AuthUser | null>(() => (seeded
		? initialUser
		: null));
	const [loading, setLoading] = useState(() => enabled && !seeded);
	const [sessionUnavailable, setSessionUnavailable] = useState<string | null>(null);

	const refresh = useCallback(async (quiet = false) => {
		if(!enabled) {
			return;
		}
		if(!quiet) {
			setLoading(true);
		}
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
	}, [enabled]);

	useEffect(() => {
		if(!enabled) {
			return;
		}
		// Seeded: confirm in the background without the invisible Account placeholder.
		void refresh(seeded);
	}, [enabled, refresh, seeded]);

	const signOut = useCallback(async () => {
		if(!enabled) {
			return;
		}
		await logoutUser().catch(() => undefined);
		setUser(null);
		setSessionUnavailable(null);
	}, [enabled]);

	const publicRefresh = useCallback(async () => {
		await refresh(false);
	}, [refresh]);

	return {
		user,
		loading,
		refresh: publicRefresh,
		signOut,
		sessionUnavailable,
	};
}

/**
 * SSR-seeded session for PeM (and anywhere else that can decide before paint).
 * Pass `initialUser` from a server layout after `getCurrentUser()`.
 */
export function SessionProvider({
	children,
	initialUser = null,
}: {
	children: ReactNode;
	initialUser?: AuthUser | null;
}) {
	const value = useSessionController({
		enabled: true,
		seeded: true,
		initialUser,
	});
	return createElement(SessionContext.Provider, { value }, children);
}

export function useSession(): SessionValue {
	const ctx = useContext(SessionContext);
	// Auth pages outside PeM still work without a provider.
	const standalone = useSessionController({
		enabled: ctx == null,
		seeded: false,
	});
	return ctx ?? standalone;
}
