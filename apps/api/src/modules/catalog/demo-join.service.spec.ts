import { DemoJoinService } from './demo-join.service';

describe('DemoJoinService token non-disclosure (PEM-207)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	const vendor = {
		id: 'vendor_demo',
		name: 'Demo Supply Co.',
		slug: 'demo-supply',
	};

	const owner = { id: 'owner_1', email: 'admin@austenstrine.dev' };

	function buildService(opts?: {
		pendingToken?: string | null;
		mailFails?: boolean;
		alreadyMember?: boolean;
	}) {
		const pendingToken = opts?.pendingToken ?? null;
		const prisma = {
			vendorMember: {
				findFirst: jest.fn().mockImplementation(
					async (args: { where?: { role?: string; user?: { email?: string } } }) => {
						if(args.where?.role === 'OWNER') {
							return { user: owner };
						}
						if(opts?.alreadyMember && args.where?.user) {
							return { role: 'EDITOR' };
						}
						return null;
					},
				),
				create: jest.fn(),
			},
			vendorInvite: {
				findFirst: jest.fn().mockResolvedValue(
					pendingToken
						? {
								token: pendingToken,
								expiresAt: new Date('2030-01-01T00:00:00.000Z'),
							}
						: null,
				),
				create: jest.fn().mockResolvedValue({}),
			},
			vendor: {
				findUnique: jest.fn().mockResolvedValue(vendor),
			},
			user: {
				findUnique: jest.fn().mockResolvedValue(owner),
			},
		};

		const mail = {
			sendMailWithAttachment: jest.fn().mockImplementation(async () => {
				if(opts?.mailFails) {
					throw new Error('mail down');
				}
			}),
		};

		const service = new DemoJoinService(prisma as never, mail as never);
		jest.spyOn(
			service as unknown as {
				demoVendorSeed: () => { id: string; slug: string; name: string };
			},
			'demoVendorSeed',
		).mockReturnValue(vendor);

		return { service, prisma, mail };
	}

	it('never returns raw token or acceptPath when minting an invite', async () => {
		const { service, prisma, mail } = buildService();

		const result = await service.joinDemo('new.seller@example.com');

		expect(result).toMatchObject({
			alreadyMember: false,
			email: 'new.seller@example.com',
			mailSent: true,
			vendorSlug: 'demo-supply',
		});
		expect(result).not.toHaveProperty('token');
		expect(result).not.toHaveProperty('acceptPath');
		expect(prisma.vendorInvite.create).toHaveBeenCalledTimes(1);
		expect(mail.sendMailWithAttachment).toHaveBeenCalledTimes(1);
		const createArg = prisma.vendorInvite.create.mock.calls[0][0];
		expect(createArg.data.token).toEqual(expect.any(String));
		expect(createArg.data.token.length).toBeGreaterThan(16);
	});

	it('reuses a pending invite without disclosing its token', async () => {
		const { service, prisma, mail } = buildService({
			pendingToken: 'existing-secret-token',
		});

		const result = await service.joinDemo('pending@example.com');

		expect(result.alreadyMember).toBe(false);
		expect(result.mailSent).toBe(true);
		expect(result).not.toHaveProperty('token');
		expect(result).not.toHaveProperty('acceptPath');
		expect(prisma.vendorInvite.create).not.toHaveBeenCalled();
		expect(mail.sendMailWithAttachment).toHaveBeenCalledTimes(1);
		const mailArg = mail.sendMailWithAttachment.mock.calls[0][0];
		expect(mailArg.text).toContain('existing-secret-token');
	});

	it('keeps the token out of the response when mail fails', async () => {
		const { service, mail } = buildService({ mailFails: true });

		const result = await service.joinDemo('local@example.com');

		expect(result.mailSent).toBe(false);
		expect(result).not.toHaveProperty('token');
		expect(result).not.toHaveProperty('acceptPath');
		expect(mail.sendMailWithAttachment).toHaveBeenCalledTimes(1);
	});

	it('short-circuits already-member without minting or mailing', async () => {
		const { service, prisma, mail } = buildService({ alreadyMember: true });

		const result = await service.joinDemo('editor@austenstrine.dev');

		expect(result).toEqual({
			alreadyMember: true,
			vendorId: vendor.id,
			vendorName: vendor.name,
			vendorSlug: vendor.slug,
			role: 'EDITOR',
			email: 'editor@austenstrine.dev',
			mailSent: false,
			expiresAt: null,
		});
		expect(prisma.vendorInvite.create).not.toHaveBeenCalled();
		expect(mail.sendMailWithAttachment).not.toHaveBeenCalled();
	});
});
