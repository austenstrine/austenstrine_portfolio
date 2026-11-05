import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
	absolutePageTitle,
	resolveVendorDisplayName,
} from '../../../../../lib/place-et-marque-meta';

type VendorOrdersLayoutProps = {
	children: ReactNode;
	params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({ params }: VendorOrdersLayoutProps): Promise<Metadata> {
	const { vendorId } = await params;
	const name = await resolveVendorDisplayName(vendorId);
	return {
		title: {
			absolute: absolutePageTitle(`${name} orders`),
		},
	};
}

export default function VendorOrdersLayout({ children }: VendorOrdersLayoutProps) {
	return children;
}
