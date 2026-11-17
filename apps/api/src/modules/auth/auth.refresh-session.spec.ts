import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SecurityService } from './security/security.service';

describe('AuthService.refreshSession rotation (core auth)', () => {
	const prevAccess = process.env.JWT_ACCESS_SECRET;

	beforeAll(() => {
		process.env.JWT_ACCESS_SECRET = 'test-access-secret';
	});

	afterAll(() => {
		if(prevAccess === undefined) {
			delete process.env.JWT_ACCESS_SECRET;
		}
		else {
			process.env.JWT_ACCESS_SECRET = prevAccess;
		}
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function buildService(opts?: {
		existing?: {
			id: string;
			userId: string;
			familyId: string;
			revokedAt: Date | null;
			expiresAt: Date;
			user: { id: string; email: string };
		} | null;
	}) {
		const security = new SecurityService();
		const raw = 'refresh-token-raw';
		const tokenHash = security.hashOpaqueToken(raw);
		const existing =
			opts && 'existing' in opts
				? opts.existing
				: {
						id: 'rt_1',
						userId: 'user_1',
						familyId: 'fam_1',
						revokedAt: null as Date | null,
						expiresAt: new Date(Date.now() + 60_000),
						user: { id: 'user_1', email: 'buyer@example.com' },
					};

		const prisma = {
			refreshToken: {
				findUnique: jest.fn().mockResolvedValue(
					existing
						? { ...existing, tokenHash }
						: null,
				),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
				update: jest.fn().mockResolvedValue({}),
				create: jest.fn().mockResolvedValue({}),
			},
			$transaction: jest.fn(async (ops: Promise<unknown>[]) =>
				Promise.all(ops),
			),
		};

		const jwt = {
			signAsync: jest.fn().mockResolvedValue('access.jwt'),
		};
		const mail = {
			sendOtpEmail: jest.fn(),
		};

		const service = new AuthService(
			prisma as never,
			jwt as never,
			mail as never,
			security,
		);

		return { service, prisma, security, raw, existing };
	}

	it('rejects missing refresh tokens', async () => {
		const { service, prisma } = buildService({ existing: null });

		await expect(
			service.refreshSession('unknown', {}),
		).rejects.toBeInstanceOf(UnauthorizedException);
		expect(prisma.refreshToken.updateMany).not.toHaveBeenCalled();
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('burns the token family when a revoked refresh is reused', async () => {
		const { service, prisma, raw, existing } = buildService({
			existing: {
				id: 'rt_stolen',
				userId: 'user_1',
				familyId: 'fam_steal',
				revokedAt: new Date('2026-01-01T00:00:00.000Z'),
				expiresAt: new Date(Date.now() + 60_000),
				user: { id: 'user_1', email: 'buyer@example.com' },
			},
		});

		await expect(
			service.refreshSession(raw, {}),
		).rejects.toBeInstanceOf(UnauthorizedException);

		expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
			where: { familyId: existing!.familyId, revokedAt: null },
			data: { revokedAt: expect.any(Date) },
		});
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('rotates to a new refresh token on a valid session', async () => {
		const { service, prisma, raw } = buildService();

		const session = await service.refreshSession(raw, {
			userAgent: 'jest',
			ipAddress: '127.0.0.1',
		});

		expect(session.accessToken).toBe('access.jwt');
		expect(session.refreshToken).toEqual(expect.any(String));
		expect(session.refreshToken).not.toBe(raw);
		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(prisma.refreshToken.update).toHaveBeenCalled();
		expect(prisma.refreshToken.create).toHaveBeenCalled();
	});
});
