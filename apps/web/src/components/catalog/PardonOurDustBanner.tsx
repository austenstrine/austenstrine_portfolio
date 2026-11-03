import { headers } from 'next/headers';
import {
	maintenanceBannerMessage,
	requestHostname,
	shouldShowMaintenanceBanner,
} from '../../lib/maintenance-banner';

export async function PardonOurDustBanner() {
	const headerStore = await headers();
	const host = requestHostname(
		headerStore.get('x-forwarded-host')
			?? headerStore.get('host')
			?? '',
	);

	if(!shouldShowMaintenanceBanner(host)) {
		return null;
	}

	return (
		<div
			className="
				fixed
				inset-x-0
				top-0
				z-40
				border-b
				border-sky/20
				bg-sky
				px-gutter
				py-2.5
				text-center
				text-sm
				font-medium
				text-white
			"
			data-maintenance-banner=""
			role="status"
		>
			{maintenanceBannerMessage()}
		</div>
	);
}
