import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
	title: 'Enter your code',
};

export default function Layout({ children }: { children: ReactNode }) {
	return children;
}
