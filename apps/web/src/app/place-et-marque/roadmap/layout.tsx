import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
	title: 'Roadmap',
	description:
		'Place et Marque work in progress: planned refine work, completed landings, and a place to send suggestions.',
};

export default function Layout({ children }: { children: ReactNode }) {
	return children;
}
