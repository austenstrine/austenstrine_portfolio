import { BadRequestException, ConflictException } from '@nestjs/common';
import { VendorLinkNameRequestStatus } from '@prisma/client';
import { VendorService } from './vendor.service';

describe('VendorService link-name approve TOCTOU (PEM-207)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	type TxClient = {
		vendor: {
			findMany: jest.Mock;
			update: jest.Mock;
		};
		vendorLinkNameRequest: {
			updateMany: jest.Mock;
			findUniqueOrThrow: jest.Mock;
		};
	};

	function buildService(opts?: {
		otherSlugs?: string[];
		claimCount?: number;
		slugUpdateError?: unknown;
	}) {
		const otherSlugs = opts?.otherSlugs ?? ['other-vendor'];
		const claimCount = opts?.claimCount ?? 1;

		const pendingRequest = {
			id: 'req_1',
			vendorId: 'vendor_a',
			requestedSlug: 'shared-slug',
			status: VendorLinkNameRequestStatus.PENDING,
			vendor: {
				id: 'vendor_a',
				slug: 'old-slug',
			},
		};

		const tx: TxClient = {
			vendor: {
				findMany: jest.fn().mockResolvedValue(
					otherSlugs.map((slug) => ({ slug })),
				),
				update: jest.fn().mockImplementation(async () => {
					if(opts?.slugUpdateError) {
						throw opts.slugUpdateError;
					}
					return {
						id: 'vendor_a',
						slug: 'shared-slug',
					};
				}),
			},
			vendorLinkNameRequest: {
				updateMany: jest.fn().mockResolvedValue({ count: claimCount }),
				findUniqueOrThrow: jest.fn().mockResolvedValue({
					id: 'req_1',
					status: VendorLinkNameRequestStatus.APPROVED,
					reviewReason: null,
				}),
			},
		};

		const prisma = {
			vendorLinkNameRequest: {
				findUnique: jest.fn().mockResolvedValue(pendingRequest),
			},
			$transaction: jest.fn(async (fn: (client: TxClient) => Promise<unknown>) =>
				fn(tx),
			),
		};

		const vendorAccess = {
			assertIsSuperVendorMember: jest.fn().mockResolvedValue(undefined),
		};

		const service = new VendorService(prisma as never, vendorAccess as never);
		return { service, prisma, tx, vendorAccess };
	}

	it('checks availability inside the approve transaction before claiming', async () => {
		const { service, prisma, tx } = buildService({
			otherSlugs: ['other-vendor'],
		});

		const result = await service.reviewLinkNameRequest('admin_1', 'req_1', {
			decision: 'approve',
		});

		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		expect(tx.vendor.findMany).toHaveBeenCalledWith({
			where: { id: { not: 'vendor_a' } },
			select: { slug: true },
		});
		expect(tx.vendorLinkNameRequest.updateMany).toHaveBeenCalledWith({
			where: {
				id: 'req_1',
				status: VendorLinkNameRequestStatus.PENDING,
			},
			data: expect.objectContaining({
				status: VendorLinkNameRequestStatus.APPROVED,
				reviewedByUserId: 'admin_1',
			}),
		});
		expect(tx.vendor.update).toHaveBeenCalledWith({
			where: { id: 'vendor_a' },
			data: { slug: 'shared-slug' },
		});
		expect(result).toEqual({
			id: 'req_1',
			status: VendorLinkNameRequestStatus.APPROVED,
			reviewReason: null,
			vendorSlug: 'shared-slug',
		});
	});

	it('rejects when the slug is taken inside the transaction', async () => {
		const { service, tx } = buildService({
			otherSlugs: ['shared-slug'],
		});

		await expect(
			service.reviewLinkNameRequest('admin_1', 'req_1', {
				decision: 'approve',
			}),
		).rejects.toBeInstanceOf(ConflictException);

		expect(tx.vendorLinkNameRequest.updateMany).not.toHaveBeenCalled();
		expect(tx.vendor.update).not.toHaveBeenCalled();
	});

	it('rejects when PENDING→APPROVED CAS loses', async () => {
		const { service, tx } = buildService({ claimCount: 0 });

		await expect(
			service.reviewLinkNameRequest('admin_1', 'req_1', {
				decision: 'approve',
			}),
		).rejects.toBeInstanceOf(BadRequestException);

		expect(tx.vendor.update).not.toHaveBeenCalled();
	});

	it('maps Vendor.slug unique violation to taken conflict', async () => {
		const { service } = buildService({
			otherSlugs: ['other-vendor'],
			slugUpdateError: { code: 'P2002', meta: { target: ['slug'] } },
		});

		await expect(
			service.reviewLinkNameRequest('admin_1', 'req_1', {
				decision: 'approve',
			}),
		).rejects.toBeInstanceOf(ConflictException);
	});

});
