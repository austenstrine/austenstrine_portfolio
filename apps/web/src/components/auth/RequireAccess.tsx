'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { listMyVendors } from '../../lib/catalog-api';
import {
	accessReason,
	buildLoginUrl,
	buildVendorGateUrl,
	type AccessReasonKey,
} from '../../lib/accessGate';
import { useSession } from '../../lib/useSession';

type RequireAccessProps = {
	children: ReactNode;
	/** When true, user must belong to at least one vendor organization. */
	vendorRequired?: boolean;
	reasonKey?: AccessReasonKey;
	/** Override the canned reason copy (already session-resolved if needed). */
	reason?: string;
};

function AccessFallback() {
	return (
		<p className="text-sm text-slate-500">
			Checking access…
		</p>
	);
}

/**
 * Gate that may call `useSearchParams` + `router.replace`. Always wrap the
 * searchParams consumer in Suspense (Next 14 CSR bailout) — callers that put
 * Suspense *inside* this tree still remount-loop (notifications inbox).
 */
export function RequireAccess(props: RequireAccessProps) {
	return (
		<Suspense fallback={<AccessFallback />}>
			<RequireAccessInner {...props} />
		</Suspense>
	);
}

function RequireAccessInner({
	children,
	vendorRequired = false,
	reasonKey,
	reason,
}: RequireAccessProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const search = searchParams.toString();
	const { user, loading: sessionLoading, sessionUnavailable, refresh } = useSession();
	const [vendorLoading, setVendorLoading] = useState(vendorRequired);
	const [allowed, setAllowed] = useState(false);
	const [vendorCheckFailed, setVendorCheckFailed] = useState<string | null>(null);
	const [retryKey, setRetryKey] = useState(0);

	const reasonKeyOrDefault: AccessReasonKey = reasonKey ?? 'vendors';
	const guestMessage =
		reason
		?? accessReason(reasonKeyOrDefault, false);
	const signedInMessage =
		reason
		?? accessReason(reasonKeyOrDefault, true);

	useEffect(() => {
		// Null-seed SessionProvider keeps loading=true until the first client
		// probe settles — do not bounce to login before that (stale access +
		// recoverable refresh must not account↔login↔notifications loop).
		if(sessionLoading) {
			return;
		}

		const next = search ? `${pathname}?${search}` : pathname;

		if(sessionUnavailable && !user) {
			setVendorLoading(false);
			setAllowed(false);
			return;
		}

		if(!user) {
			const loginUrl = buildLoginUrl({
				next,
				reason: guestMessage,
			});
			// Avoid replace storms when searchParams CSR bailout remounts the gate.
			if(pathname.startsWith('/auth/login')) {
				return;
			}
			router.replace(loginUrl);
			return;
		}

		if(!vendorRequired) {
			setVendorLoading(false);
			setVendorCheckFailed(null);
			setAllowed(true);
			return;
		}

		let cancelled = false;
		setVendorLoading(true);
		setVendorCheckFailed(null);
		listMyVendors()
			.then((vendors) => {
				if(cancelled) {
					return;
				}
				if(vendors.length === 0) {
					router.replace(
						buildVendorGateUrl(next, signedInMessage),
					);
					return;
				}
				setAllowed(true);
			})
			.catch((error) => {
				if(cancelled) {
					return;
				}
				setAllowed(false);
				setVendorCheckFailed(
					error instanceof Error
						? error.message
						: 'Could not verify vendor access. Try again.',
				);
			})
			.finally(() => {
				if(!cancelled) {
					setVendorLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [
		sessionLoading,
		user,
		sessionUnavailable,
		vendorRequired,
		pathname,
		search,
		router,
		guestMessage,
		signedInMessage,
		retryKey,
	]);

	if(sessionUnavailable && !user) {
		return (
			<div className="space-y-3 text-sm text-slate-600">
				<p>
					Sign-in service is temporarily unavailable.
					{' '}
					{sessionUnavailable}
				</p>
				<button
					type="button"
					className="
						rounded-full
						border
						border-slate-300
						px-4
						py-2
						text-sm
						font-semibold
						text-slate-700
						hover:border-sky
						hover:text-sky
					"
					onClick={() => void refresh()}
				>
					Retry
				</button>
			</div>
		);
	}

	if(vendorCheckFailed) {
		return (
			<div className="space-y-3 text-sm text-slate-600">
				<p>
					Could not reach vendor memberships right now.
					{' '}
					{vendorCheckFailed}
				</p>
				<button
					type="button"
					className="
						rounded-full
						border
						border-slate-300
						px-4
						py-2
						text-sm
						font-semibold
						text-slate-700
						hover:border-sky
						hover:text-sky
					"
					onClick={() => setRetryKey((value) => value + 1)}
				>
					Retry
				</button>
			</div>
		);
	}

	if(sessionLoading || vendorLoading || !allowed) {
		return <AccessFallback />;
	}

	return (
		<>
			{children}
		</>
	);
}
