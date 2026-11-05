import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { resolveVendorDisplayName } from '../../../../../lib/place-et-marque-meta';

type VendorOrdersLayoutProps = {
	children: ReactNode;
	params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({ params }: VendorOrdersLayoutProps): Promise<Metadata> {
	const { vendorId } = await params;
	const name = await resolveVendorDisplayName(vendorId);
	return {
		title: `${name} orders`,
	};
}

export default function VendorOrdersLayout({ children }: VendorOrdersLayoutProps) {
	return children;
}
