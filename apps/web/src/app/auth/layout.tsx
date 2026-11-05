import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { PLACE_ET_MARQUE_NAME } from '../../lib/place-et-marque-meta';

export const metadata: Metadata = {
	title: {
		absolute: PLACE_ET_MARQUE_NAME,
		template: `%s · ${PLACE_ET_MARQUE_NAME}`,
	},
};

export default function AuthLayout({ children }: { children: ReactNode }) {
	return children;
}
