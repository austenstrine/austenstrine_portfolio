'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';

function crmPublicBase(): string {
	const fromEnv = process.env.NEXT_PUBLIC_CRM_URL?.trim();
	if(fromEnv) {
		return fromEnv.replace(/\/$/, '');
	}
	if(typeof window === 'undefined') {
		return 'http://localhost:3001';
	}
	const { protocol, hostname } = window.location;
	if(hostname === 'localhost' || hostname === '127.0.0.1') {
		return `${protocol}//localhost:3001`;
	}
	if(hostname.startsWith('local.')) {
		// local.austenstrine.dev → crm.local.austenstrine.dev
		return `${protocol}//crm.${hostname}`;
	}
	if(hostname.startsWith('www.')) {
		return `${protocol}//crm.${hostname.slice('www.'.length)}`;
	}
	return `${protocol}//crm.${hostname}`;
}

function UomMergeRedirect() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token')?.trim() ?? '';

	useEffect(() => {
		const base = crmPublicBase();
		const target = token
			? `${base}/uom-merges?token=${encodeURIComponent(token)}`
			: `${base}/uom-merges`;
		window.location.replace(target);
	}, [token]);

	return (
		<div
			className="
				mx-auto
				flex
				max-w-lg
				flex-col
				gap-4
			"
		>
			<h1
				className="
					text-3xl
					font-semibold
					tracking-tight
				"
			>
				UOM merge decision
			</h1>
			<p className="text-sm text-slate-600">
				Opening the admin CRM…
			</p>
		</div>
	);
}

export default function UomMergePage() {
	return (
		<Suspense
			fallback={
				<p className="text-sm text-slate-500">
					Loading…
				</p>
			}
		>
			<UomMergeRedirect />
		</Suspense>
	);
}
