import { UnauthorizedException } from '@nestjs/common';
import { CatalogAuthGuard } from './catalog-auth.guard';

function mockContext(opts: {
	authorization?: string;
	cookies?: Record<string, string>;
}) {
	const req = {
		headers: {
			authorization: opts.authorization,
		},
		cookies: opts.cookies ?? {},
		user: undefined as { id: string; email: string } | undefined,
		catalogActor: undefined as unknown,
	};
	return {
		req,
		context: {
			switchToHttp: () => ({
				getRequest: () => req,
			}),
		} as never,
	};
}

describe('CatalogAuthGuard session gates', () => {
	const prevSecret = process.env.JWT_ACCESS_SECRET;

	afterEach(() => {
		if(prevSecret === undefined) {
			delete process.env.JWT_ACCESS_SECRET;
		}
		else {
			process.env.JWT_ACCESS_SECRET = prevSecret;
		}
		jest.restoreAllMocks();
	});

	function buildGuard(opts?: {
		verifyPayload?: { sub: string; type: string };
		user?: { id: string; email: string } | null;
		appActor?: {
			kind: 'app_password';
			vendorId: string;
			passwordId: string;
			createdByUserId: string;
		} | null;
	}) {
		const jwt = {
			verify: jest.fn().mockImplementation(() => {
				if(!opts?.verifyPayload) {
					throw new Error('bad token');
				}
				return opts.verifyPayload;
			}),
		};
		const auth = {
			getUserById: jest.fn().mockResolvedValue(
				opts?.user === undefined
					? { id: 'user_1', email: 'buyer@example.com' }
					: opts.user,
			),
		};
		const appPasswords = {
			authenticateBearer: jest.fn().mockResolvedValue(
				opts?.appActor === undefined ? null : opts.appActor,
			),
		};
		const guard = new CatalogAuthGuard(
			jwt as never,
			auth as never,
			appPasswords as never,
		);
		return { guard, jwt, auth, appPasswords };
	}

	it('rejects requests with no bearer or access cookie', async () => {
		const { guard } = buildGuard();
		const { context } = mockContext({});
		await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it('rejects non-access JWT payloads', async () => {
		process.env.JWT_ACCESS_SECRET = 'test-access-secret';
		const { guard, auth } = buildGuard({
			verifyPayload: { sub: 'user_1', type: 'refresh' },
		});
		const { context } = mockContext({
			authorization: 'Bearer not-an-access-token',
		});

		await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
		expect(auth.getUserById).not.toHaveBeenCalled();
	});

	it('accepts a valid access token from the cookie', async () => {
		process.env.JWT_ACCESS_SECRET = 'test-access-secret';
		const { guard, req, context } = (() => {
			const built = buildGuard({
				verifyPayload: { sub: 'user_1', type: 'access' },
				user: { id: 'user_1', email: 'buyer@example.com' },
			});
			const mocked = mockContext({
				cookies: { access_token: 'cookie.jwt' },
			});
			return { ...built, ...mocked };
		})();

		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(req.user).toEqual({ id: 'user_1', email: 'buyer@example.com' });
		expect(req.catalogActor).toEqual({ kind: 'user', userId: 'user_1' });
	});

	it('accepts vas_ app-password bearers', async () => {
		const actor = {
			kind: 'app_password' as const,
			vendorId: 'vendor_1',
			passwordId: 'ap_1',
			createdByUserId: 'user_1',
		};
		const { guard, appPasswords } = buildGuard({ appActor: actor });
		const { req, context } = mockContext({
			authorization: 'Bearer vas_secret',
		});

		await expect(guard.canActivate(context)).resolves.toBe(true);
		expect(appPasswords.authenticateBearer).toHaveBeenCalledWith('vas_secret');
		expect(req.catalogActor).toEqual(actor);
	});
});
