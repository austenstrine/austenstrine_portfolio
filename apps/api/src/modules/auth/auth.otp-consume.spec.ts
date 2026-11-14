import { BadRequestException } from '@nestjs/common';
import { EmailOtpPurpose } from '@prisma/client';
import { AuthService } from './auth.service';
import { SecurityService } from './security/security.service';

describe('AuthService consumeOtp transactional (PEM-199)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	function buildService() {
		const security = new SecurityService();
		const code = '123456';
		const codeHash = security.hashOtpCode(code);
		const otpRow = {
			id: 'otp_1',
			userId: 'user_1',
			purpose: EmailOtpPurpose.EMAIL_VERIFICATION,
			codeHash,
			attempts: 0,
			consumedAt: null as Date | null,
			expiresAt: new Date(Date.now() + 60_000),
			createdAt: new Date(),
		};

		const tx = {
			emailOtp: {
				findFirst: jest.fn().mockResolvedValue(otpRow),
				update: jest.fn().mockResolvedValue(otpRow),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
			},
		};

		const prisma = {
			$transaction: jest.fn(async (fn: (client: typeof tx) => Promise<void>) =>
				fn(tx),
			),
			user: {
				findUnique: jest.fn().mockResolvedValue({
					id: 'user_1',
					email: 'buyer@example.com',
					emailVerifiedAt: null,
				}),
				update: jest.fn().mockImplementation(async ({ data }) => ({
					id: 'user_1',
					email: 'buyer@example.com',
					emailVerifiedAt: data.emailVerifiedAt,
					passwordHash: 'hash',
					failedLoginAttempts: 0,
					lockedUntil: null,
				})),
			},
			refreshToken: {
				create: jest.fn().mockResolvedValue({
					id: 'rt_1',
					expiresAt: new Date(Date.now() + 86_400_000),
				}),
			},
		};

		const jwt = {
			signAsync: jest.fn().mockResolvedValue('access.jwt'),
		};
		const mail = {
			sendOtpEmail: jest.fn().mockResolvedValue(undefined),
		};

		const service = new AuthService(
			prisma as never,
			jwt as never,
			mail as never,
			security,
		);

		return { service, prisma, tx, security, code, otpRow };
	}

	it('consumes OTP inside $transaction with consumedAt CAS', async () => {
		const { service, prisma, tx, code } = buildService();
		jest
			.spyOn(
				service as unknown as {
					issueSession: (...args: unknown[]) => Promise<unknown>;
				},
				'issueSession',
			)
			.mockResolvedValue({
				user: { id: 'user_1' },
				accessToken: 'a',
				refreshToken: 'r',
				accessTokenExpiresInSeconds: 1,
				refreshTokenExpiresAt: new Date(),
			});

		await service.verifyEmail({ email: 'buyer@example.com', code }, {});

		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(tx.emailOtp.findFirst).toHaveBeenCalledWith({
			where: {
				userId: 'user_1',
				purpose: EmailOtpPurpose.EMAIL_VERIFICATION,
				consumedAt: null,
			},
			orderBy: { createdAt: 'desc' },
		});
		expect(tx.emailOtp.updateMany).toHaveBeenCalledWith({
			where: { id: 'otp_1', consumedAt: null },
			data: { consumedAt: expect.any(Date) },
		});
	});

	it('rejects when concurrent consume already won the CAS', async () => {
		const { service, tx, code } = buildService();
		tx.emailOtp.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			service.verifyEmail({ email: 'buyer@example.com', code }, {}),
		).rejects.toBeInstanceOf(BadRequestException);

		expect(tx.emailOtp.updateMany).toHaveBeenCalled();
	});

	it('increments attempts inside the same transaction on bad code', async () => {
		const { service, tx } = buildService();

		await expect(
			service.verifyEmail(
				{ email: 'buyer@example.com', code: '000000' },
				{},
			),
		).rejects.toBeInstanceOf(BadRequestException);

		expect(tx.emailOtp.update).toHaveBeenCalledWith({
			where: { id: 'otp_1' },
			data: { attempts: { increment: 1 } },
		});
		expect(tx.emailOtp.updateMany).not.toHaveBeenCalled();
	});
});
