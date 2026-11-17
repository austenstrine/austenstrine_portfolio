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
	// Null seed: SSR often cannot refresh (refresh cookie used to be path-scoped
	// to /api/auth, so HTML navigations omitted it). Stay loading until the
	// first client probe so RequireAccess does not bounce to login before
	// refresh can recover — adversary bar for notifications/account family.
	const [loading, setLoading] = useState(
		() => enabled && (!seeded || initialUser == null),
	);
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
			// Seeded as signed-in then rejected: clear leftover cookies so the
			// next HTML navigation does not SSR-seed a zombie session.
			if(initialUser != null) {
				void logoutUser().catch(() => undefined);
			}
		}
		else {
			// Keep the last known user on a blip so seller pages do not bounce to Sign in.
			setSessionUnavailable(probe.message);
		}
		setLoading(false);
	}, [enabled, initialUser]);

	useEffect(() => {
		if(!enabled) {
			return;
		}
		// Seeded non-null: confirm quietly (PEM-373). Null seed: still probing
		// with loading=true until this settles.
		void refresh(seeded && initialUser != null);
	}, [enabled, refresh, seeded, initialUser]);

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
 * Null seed stays `loading` until the first client probe (stale-session recovery).
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
