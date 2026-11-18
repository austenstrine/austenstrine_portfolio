'use client';

import {
	createContext,
	createElement,
	useCallback,
	useContext,
	useEffect,
	useRef,
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
	/**
	 * After login / 2FA / email-verify, cookies are set but the PeM layout
	 * SessionProvider stays mounted with a guest seed. Soft `router.push`
	 * does not re-run the mount probe — adopt the issued user before navigate
	 * so RequireAccess / header see signed-in (PEM-505). Prefer
	 * `finishSignedInNavigation` so the next document load SSR-reseeds
	 * (PEM-514).
	 */
	adoptSignedIn: (user: AuthUser) => void;
	signOut: () => Promise<void>;
	sessionUnavailable: string | null;
};

/**
 * Cookies just landed; soft `router.push` keeps the guest SSR seed on the
 * still-mounted SessionProvider. Adopt for the current tree, then full
 * document load so layout `getCurrentUser()` / header re-read cookies
 * (PEM-514).
 */
export function finishSignedInNavigation(
	adoptSignedIn: (user: AuthUser) => void,
	user: AuthUser,
	destination: string,
): void {
	adoptSignedIn(user);
	window.location.assign(destination);
}

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
	// Bump on adopt so a late guest mount-probe cannot wipe the signed-in user
	// before the hard remount (PEM-514).
	const probeGeneration = useRef(0);

	const refresh = useCallback(async (quiet = false) => {
		if(!enabled) {
			return;
		}
		const generation = probeGeneration.current;
		if(!quiet) {
			setLoading(true);
		}
		const probe = await probeCurrentUser();
		if(generation !== probeGeneration.current) {
			return;
		}
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

	// SSR seed can catch up after a hard remount / router.refresh without
	// remounting this fiber — only adopt upward (never clobber signed-in with
	// a stale null prop).
	useEffect(() => {
		if(!enabled || !seeded || initialUser == null) {
			return;
		}
		setUser(initialUser);
		setSessionUnavailable(null);
		setLoading(false);
	}, [enabled, seeded, initialUser]);

	const signOut = useCallback(async () => {
		if(!enabled) {
			return;
		}
		probeGeneration.current += 1;
		await logoutUser().catch(() => undefined);
		setUser(null);
		setSessionUnavailable(null);
	}, [enabled]);

	const adoptSignedIn = useCallback((next: AuthUser) => {
		if(!enabled) {
			return;
		}
		probeGeneration.current += 1;
		setUser(next);
		setSessionUnavailable(null);
		setLoading(false);
	}, [enabled]);

	const publicRefresh = useCallback(async () => {
		await refresh(false);
	}, [refresh]);

	return {
		user,
		loading,
		refresh: publicRefresh,
		adoptSignedIn,
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
