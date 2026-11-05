import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
	absolutePageTitle,
	resolveVendorDisplayName,
} from '../../../../../lib/place-et-marque-meta';

type ImportLayoutProps = {
	children: ReactNode;
	params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({ params }: ImportLayoutProps): Promise<Metadata> {
	const { vendorId } = await params;
	const name = await resolveVendorDisplayName(vendorId);
	return {
		title: {
			absolute: absolutePageTitle(`${name} import`),
		},
	};
}

export default function ImportLayout({ children }: ImportLayoutProps) {
	return children;
}
