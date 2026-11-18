import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
	accessReason,
	buildLoginUrl,
	pemAuthPath,
} from '../../../../lib/accessGate';
import { getCurrentUser } from '../../../../lib/auth-api';

export const metadata: Metadata = {
	title: 'Account',
};

export default async function AccountLayout({ children }: { children: ReactNode }) {
	// Auth chrome before paint (PEM-373): PeM layout already SSR-seeds session.
	// True guests (no cookies) one-shot to login; cookie-present without SSR
	// user lets the client probe recover — do not bounce account↔login.
	const user = await getCurrentUser().catch(() => null);
	if(!user) {
		const jar = cookies();
		const hasAuthCookie = Boolean(
			jar.get('access_token')?.value
			|| jar.get('refresh_token')?.value,
		);
		if(!hasAuthCookie) {
			redirect(
				buildLoginUrl({
					next: pemAuthPath('/account'),
					reason: accessReason('account', false),
				}),
			);
		}
	}

	return children;
}
