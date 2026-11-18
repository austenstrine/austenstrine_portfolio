import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
	title: 'Account',
};

/**
 * Account hub is guest-visible (PEM-510): no SSR login bounce.
 * Password (+ other authenticated account actions) keep their own gates.
 */
export default function AccountLayout({ children }: { children: ReactNode }) {
	return children;
}
