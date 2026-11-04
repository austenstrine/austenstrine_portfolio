'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { listMyVendors } from '../../lib/catalog-api';
import {
	buildLoginUrl,
	buildVendorGateUrl,
	type AccessReasonKey,
	ACCESS_REASONS,
} from '../../lib/accessGate';
import { useSession } from '../../lib/useSession';

type RequireAccessProps = {
	children: ReactNode;
	/** When true, user must belong to at least one vendor organization. */
	vendorRequired?: boolean;
	reasonKey?: AccessReasonKey;
	/** Override the canned reason copy. */
	reason?: string;
};

export function RequireAccess({
	children,
	vendorRequired = false,
	reasonKey,
	reason,
}: RequireAccessProps) {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const { user, loading: sessionLoading, sessionUnavailable, refresh } = useSession();
	const [vendorLoading, setVendorLoading] = useState(vendorRequired);
	const [allowed, setAllowed] = useState(false);
	const [vendorCheckFailed, setVendorCheckFailed] = useState<string | null>(null);
	const [retryKey, setRetryKey] = useState(0);

	const message =
		reason
		?? (reasonKey
			? ACCESS_REASONS[reasonKey]
			: ACCESS_REASONS.vendors
		);

	useEffect(() => {
		if(sessionLoading) {
			return;
		}

		const search = searchParams.toString();
		const next = search ? `${pathname}?${search}` : pathname;

		if(sessionUnavailable && !user) {
			setVendorLoading(false);
			setAllowed(false);
			return;
		}

		if(!user) {
			router.replace(
				buildLoginUrl({
					next,
					reason: message,
				}),
			);
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
					router.replace(buildVendorGateUrl(next));
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
		searchParams,
		router,
		message,
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
		return (
			<p className="text-sm text-slate-500">
				Checking access…
			</p>
		);
	}

	return (
		<>
			{children}
		</>
	);
}
