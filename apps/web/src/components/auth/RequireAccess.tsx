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
	const { user, loading: sessionLoading } = useSession();
	const [vendorLoading, setVendorLoading] = useState(vendorRequired);
	const [allowed, setAllowed] = useState(false);

	const message =
		reason
		?? (reasonKey ? ACCESS_REASONS[reasonKey] : ACCESS_REASONS.vendors);

	useEffect(() => {
		if(sessionLoading) {
			return;
		}

		const search = searchParams.toString();
		const next = search ? `${pathname}?${search}` : pathname;

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
			setAllowed(true);
			return;
		}

		let cancelled = false;
		setVendorLoading(true);
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
			.catch(() => {
				if(!cancelled) {
					router.replace(buildVendorGateUrl(next));
				}
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
		vendorRequired,
		pathname,
		searchParams,
		router,
		message,
	]);

	if(sessionLoading || vendorLoading || !allowed) {
		return (
			<p className="text-sm text-slate-500">
				Checking access…
			</p>
		);
	}

	return <>{children}</>;
}
