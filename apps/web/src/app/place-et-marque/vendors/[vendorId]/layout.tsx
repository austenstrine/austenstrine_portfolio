import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { resolveVendorDisplayName } from '../../../../lib/place-et-marque-meta';

type VendorLayoutProps = {
	children: ReactNode;
	params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({ params }: VendorLayoutProps): Promise<Metadata> {
	const { vendorId } = await params;
	return {
		title: await resolveVendorDisplayName(vendorId),
	};
}

export default function VendorLayout({ children }: VendorLayoutProps) {
	return children;
}
