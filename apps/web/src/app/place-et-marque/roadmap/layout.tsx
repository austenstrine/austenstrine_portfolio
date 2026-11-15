import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { absolutePageTitle } from '../../../lib/place-et-marque-meta';

export const metadata: Metadata = {
	title: absolutePageTitle('Roadmap'),
	description:
		'Place et Marque work in progress: planned refine work, completed landings, and a place to send suggestions.',
};

export default function Layout({ children }: { children: ReactNode }) {
	return children;
}
