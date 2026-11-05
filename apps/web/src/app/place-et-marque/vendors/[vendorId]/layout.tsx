import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import {
	absolutePageTitle,
	resolveVendorDisplayName,
} from '../../../../lib/place-et-marque-meta';

type VendorLayoutProps = {
	children: ReactNode;
	params: Promise<{ vendorId: string }>;
};

export async function generateMetadata({ params }: VendorLayoutProps): Promise<Metadata> {
	const { vendorId } = await params;
	const name = await resolveVendorDisplayName(vendorId);
	return {
		title: {
			absolute: absolutePageTitle(name),
		},
	};
}

export default function VendorLayout({ children }: VendorLayoutProps) {
	return children;
}
