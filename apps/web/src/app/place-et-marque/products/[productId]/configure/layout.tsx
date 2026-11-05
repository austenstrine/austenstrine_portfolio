import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
	title: 'Advanced edit product',
};

export default function ConfigureProductLayout({ children }: { children: ReactNode }) {
	return children;
}
