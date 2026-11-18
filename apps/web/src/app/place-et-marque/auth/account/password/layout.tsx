import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import {
	accessReason,
	buildLoginUrl,
	pemAuthPath,
} from '../../../../../lib/accessGate';
import { getCurrentUser } from '../../../../../lib/auth-api';

export const metadata: Metadata = {
	title: 'Password',
};

export default async function AccountPasswordLayout({
	children,
}: {
	children: ReactNode;
}) {
	// Password stays gated (PEM-510): true guests one-shot to login; cookie
	// without SSR user lets the client RequireAccess probe recover.
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
					next: pemAuthPath('/account/password'),
					reason: accessReason('account', false),
				}),
			);
		}
	}

	return children;
}
