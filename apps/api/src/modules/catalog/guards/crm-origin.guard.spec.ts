import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { CrmOriginGuard } from './crm-origin.guard';

function mockContext(headers: Record<string, string | undefined>) {
	return {
		switchToHttp: () => ({
			getRequest: () => ({ headers }),
		}),
	} as never;
}

describe('CrmOriginGuard', () => {
	const prevWeb = process.env.WEB_URL;
	const prevCrm = process.env.CRM_URL;
	const guard = new CrmOriginGuard();

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

	it('allows CRM Origin', () => {
		process.env.WEB_URL = 'https://local.austenstrine.dev';
		process.env.CRM_URL = 'https://local.crm.austenstrine.dev';
		expect(
			guard.canActivate(
				mockContext({ origin: 'https://local.crm.austenstrine.dev' }),
			),
		).toBe(true);
	});

	it('rejects Place et Marque / WEB origin', () => {
		process.env.WEB_URL = 'https://local.austenstrine.dev';
		process.env.CRM_URL = 'https://local.crm.austenstrine.dev';
		expect(() =>
			guard.canActivate(
				mockContext({ origin: 'https://local.austenstrine.dev' }),
			),
		).toThrow(ForbiddenException);
	});

	it('fails closed when CRM_URL is unset', () => {
		process.env.WEB_URL = 'https://local.austenstrine.dev';
		delete process.env.CRM_URL;
		expect(() =>
			guard.canActivate(
				mockContext({ origin: 'https://local.crm.austenstrine.dev' }),
			),
		).toThrow(ServiceUnavailableException);
	});
});
