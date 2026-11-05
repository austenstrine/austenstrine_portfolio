import {
	corsAllowedOrigins,
	isCrmBrowserOrigin,
	isWebBrowserOrigin,
	normalizeOrigin,
	requestBrowserOrigin,
} from './app-origins';

describe('app-origins', () => {
	const prevWeb = process.env.WEB_URL;
	const prevCrm = process.env.CRM_URL;

	afterEach(() => {
		if(prevWeb === undefined) {
			delete process.env.WEB_URL;
		}
		else {
			process.env.WEB_URL = prevWeb;
		}
		if(prevCrm === undefined) {
			delete process.env.CRM_URL;
		}
		else {
			process.env.CRM_URL = prevCrm;
		}
	});

	it('normalizes origins without trailing slash or path', () => {
		expect(normalizeOrigin('https://crm.austenstrine.dev/')).toBe(
			'https://crm.austenstrine.dev',
		);
		expect(normalizeOrigin('https://www.austenstrine.dev/place-et-marque')).toBe(
			'https://www.austenstrine.dev',
		);
	});

	it('corsAllowedOrigins includes web and CRM', () => {
		process.env.WEB_URL = 'https://www.austenstrine.dev';
		process.env.CRM_URL = 'https://crm.austenstrine.dev';
		expect(corsAllowedOrigins().sort()).toEqual([
			'https://crm.austenstrine.dev',
			'https://www.austenstrine.dev',
		]);
	});

	it('detects CRM vs web origins from Origin and Referer', () => {
		process.env.WEB_URL = 'https://local.austenstrine.dev';
		process.env.CRM_URL = 'https://crm.local.austenstrine.dev';

		expect(
			isCrmBrowserOrigin({ origin: 'https://crm.local.austenstrine.dev' }),
		).toBe(true);
		expect(
			isWebBrowserOrigin({ origin: 'https://local.austenstrine.dev' }),
		).toBe(true);
		expect(
			isCrmBrowserOrigin({
				referer: 'https://crm.local.austenstrine.dev/link-names',
			}),
		).toBe(true);
		expect(
			isCrmBrowserOrigin({ origin: 'https://local.austenstrine.dev' }),
		).toBe(false);
		expect(
			requestBrowserOrigin({
				referer: 'https://crm.local.austenstrine.dev/link-names?x=1',
			}),
		).toBe('https://crm.local.austenstrine.dev');
	});
});
