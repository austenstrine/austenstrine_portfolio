import { BadRequestException } from '@nestjs/common';
import { UomMergePolicyStatus } from '@prisma/client';
import { UomMergeService } from './uom-merge.service';

describe('UomMergeService MERGED token guards (PEM-199)', () => {
	const originalSecret = process.env.UOM_MERGE_SIGNING_SECRET;

	beforeAll(() => {
		process.env.UOM_MERGE_SIGNING_SECRET = 'test-uom-merge-secret';
	});

	afterAll(() => {
		if(originalSecret === undefined) {
			delete process.env.UOM_MERGE_SIGNING_SECRET;
		}
		else {
			process.env.UOM_MERGE_SIGNING_SECRET = originalSecret;
		}
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	function buildService(policyStatus: UomMergePolicyStatus | null) {
		const policy =
			policyStatus === null
				? null
				: {
						nameKey: 'box',
						status: policyStatus,
						lastNotifiedUomIds: [] as string[],
					};

		const prisma = {
			uomMergePolicy: {
				findUnique: jest.fn().mockResolvedValue(policy),
				create: jest.fn(),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
				upsert: jest.fn(),
			},
			unitOfMeasure: {
				findMany: jest.fn().mockResolvedValue([]),
			},
		};
		const mail = {
			sendMail: jest.fn(),
		};
		const service = new UomMergeService(prisma as never, mail as never);
		return { service, prisma };
	}

	it.each([
		'skip-once' as const,
		'skip-forever' as const,
		'confirm' as const,
	])('rejects %s token after MERGED', async (action) => {
		const { service, prisma } = buildService(UomMergePolicyStatus.MERGED);
		const token = service.signToken(action, 'box');

		await expect(service.handleToken(token)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(prisma.uomMergePolicy.updateMany).not.toHaveBeenCalled();
		expect(prisma.uomMergePolicy.create).not.toHaveBeenCalled();
		expect(prisma.uomMergePolicy.upsert).not.toHaveBeenCalled();
	});

	it('skip-once does not overwrite MERGED via updateMany CAS miss', async () => {
		const { service, prisma } = buildService(UomMergePolicyStatus.SKIP_ONCE);
		// First assertTokenReusable sees SKIP_ONCE; writeSkipPolicy re-reads then CAS loses to MERGED.
		prisma.uomMergePolicy.findUnique
			.mockResolvedValueOnce({
				nameKey: 'box',
				status: UomMergePolicyStatus.SKIP_ONCE,
				lastNotifiedUomIds: [],
			})
			.mockResolvedValueOnce({
				nameKey: 'box',
				status: UomMergePolicyStatus.SKIP_ONCE,
				lastNotifiedUomIds: [],
			});
		prisma.uomMergePolicy.updateMany.mockResolvedValue({ count: 0 });

		const token = service.signToken('skip-once', 'box');
		await expect(service.handleToken(token)).rejects.toBeInstanceOf(
			BadRequestException,
		);
		expect(prisma.uomMergePolicy.updateMany).toHaveBeenCalledWith({
			where: {
				nameKey: 'box',
				status: { not: UomMergePolicyStatus.MERGED },
			},
			data: {
				status: UomMergePolicyStatus.SKIP_ONCE,
				lastNotifiedUomIds: [],
			},
		});
	});

	it('skip-forever writes when policy is absent', async () => {
		const { service, prisma } = buildService(null);
		prisma.uomMergePolicy.findUnique.mockResolvedValue(null);
		prisma.uomMergePolicy.create.mockResolvedValue({
			nameKey: 'box',
			status: UomMergePolicyStatus.SKIP_FOREVER,
		});

		const token = service.signToken('skip-forever', 'box');
		const result = await service.handleToken(token);

		expect(result.action).toBe('skip-forever');
		expect(prisma.uomMergePolicy.create).toHaveBeenCalledWith({
			data: {
				nameKey: 'box',
				status: UomMergePolicyStatus.SKIP_FOREVER,
				lastNotifiedUomIds: [],
			},
		});
		expect(prisma.uomMergePolicy.updateMany).not.toHaveBeenCalled();
	});
});
