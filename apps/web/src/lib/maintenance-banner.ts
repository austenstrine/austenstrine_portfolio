export const MAINTENANCE_BANNER_STOCK_MESSAGE =
	'Pardon our dust. Place et Marque is live while we keep building. Expect rough edges.';

export function isLocalHostname(hostname: string) {
	const host = hostname.trim().toLowerCase().split(':')[0] ?? '';
	if(host.length === 0) {
		return true;
	}
	return host === 'localhost'
		|| host === '127.0.0.1'
		|| host === '[::1]'
		|| host === '::1'
		|| host.endsWith('.local')
		|| host.startsWith('local.');
}

function envFlagTrue(value: string | undefined) {
	return (value ?? '').trim().toLowerCase() === 'true';
}

/** First host from Host / X-Forwarded-Host (comma-separated). */
export function requestHostname(raw: string) {
	return (raw.split(',')[0] ?? '').trim();
}

export function shouldShowMaintenanceBanner(hostname: string) {
	if(isLocalHostname(hostname)) {
		return false;
	}
	if(envFlagTrue(process.env.maintenance_banner_bypass)) {
		return false;
	}
	return true;
}

export function maintenanceBannerMessage() {
	const custom = (process.env.maintenance_banner_message ?? '').trim();
	if(custom.length === 0) {
		return MAINTENANCE_BANNER_STOCK_MESSAGE;
	}
	return custom;
}
