import { BadRequestException } from '@nestjs/common';
import { PayoutTrigger } from '@prisma/client';
import { ShippingService } from './shipping.service';

type RateTx = {
	shippingRate: {
		updateMany: jest.Mock;
		create: jest.Mock;
		deleteMany: jest.Mock;
	};
};

function buildPrisma() {
	const tx: RateTx = {
		shippingRate: {
			updateMany: jest.fn(),
			create: jest.fn(),
			deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
		},
	};

	const prisma = {
		shippingProfile: {
			findUnique: jest.fn(),
			findUniqueOrThrow: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
			upsert: jest.fn(),
			findMany: jest.fn(),
			findFirst: jest.fn(),
		},
		shippingRate: {
			create: jest.fn(),
			updateMany: jest.fn(),
			deleteMany: jest.fn(),
		},
		catalogProduct: {
			findUnique: jest.fn(),
			update: jest.fn(),
		},
		$transaction: jest.fn(async (fn: (client: RateTx) => Promise<unknown>) =>
			fn(tx),
		),
		__tx: tx,
	};

	return prisma;
}

function buildVendorAccess() {
	return {
		assertCanEditVendor: jest.fn().mockResolvedValue(undefined),
	};
}

describe('ShippingService residuals (PEM-206)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('ensureVendorDefaults FREIGHT empty rates', () => {
		it('seeds Freight pallet when FREIGHT exists with zero rates', async () => {
			const prisma = buildPrisma();
			const vendorAccess = buildVendorAccess();

			prisma.shippingProfile.findUnique
				.mockResolvedValueOnce({
					id: 'std_1',
					vendorId: 'v1',
					code: 'STANDARD',
					rates: [{ id: 'r_ground', label: 'Ground', amountCents: 999 }],
				})
				.mockResolvedValueOnce({
					id: 'fr_1',
					vendorId: 'v1',
					code: 'FREIGHT',
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
					rates: [],
				});

			prisma.shippingRate.create.mockResolvedValue({
				id: 'r_pallet',
				profileId: 'fr_1',
				label: 'Freight pallet',
				amountCents: 14900,
			});

			const healedFreight = {
				id: 'fr_1',
				vendorId: 'v1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				rates: [
					{
						id: 'r_pallet',
						label: 'Freight pallet',
						amountCents: 14900,
					},
				],
			};
			prisma.shippingProfile.findUniqueOrThrow.mockResolvedValue(
				healedFreight,
			);

			const service = new ShippingService(
				prisma as never,
				vendorAccess as never,
			);
			const result = await service.ensureVendorDefaults('v1');

			expect(prisma.shippingRate.create).toHaveBeenCalledWith({
				data: {
					profileId: 'fr_1',
					label: 'Freight pallet',
					amountCents: 14900,
				},
			});
			expect(result.freight).toEqual(healedFreight);
		});

		it('heals empty rates after forcing drifted FREIGHT flags', async () => {
			const prisma = buildPrisma();
			const vendorAccess = buildVendorAccess();

			prisma.shippingProfile.findUnique
				.mockResolvedValueOnce({
					id: 'std_1',
					vendorId: 'v1',
					code: 'STANDARD',
					rates: [{ id: 'r_ground', label: 'Ground', amountCents: 999 }],
				})
				.mockResolvedValueOnce({
					id: 'fr_1',
					vendorId: 'v1',
					code: 'FREIGHT',
					shipsSeparately: false,
					payoutTrigger: PayoutTrigger.ON_PAYMENT,
					rates: [],
				});

			prisma.shippingProfile.update.mockResolvedValue({
				id: 'fr_1',
				vendorId: 'v1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				rates: [],
			});

			prisma.shippingRate.create.mockResolvedValue({
				id: 'r_pallet',
				profileId: 'fr_1',
				label: 'Freight pallet',
				amountCents: 14900,
			});

			const healedFreight = {
				id: 'fr_1',
				vendorId: 'v1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				rates: [
					{
						id: 'r_pallet',
						label: 'Freight pallet',
						amountCents: 14900,
					},
				],
			};
			prisma.shippingProfile.findUniqueOrThrow.mockResolvedValue(
				healedFreight,
			);

			const service = new ShippingService(
				prisma as never,
				vendorAccess as never,
			);
			const result = await service.ensureVendorDefaults('v1');

			expect(prisma.shippingProfile.update).toHaveBeenCalledWith({
				where: { id: 'fr_1' },
				data: {
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				},
				include: { rates: true },
			});
			expect(prisma.shippingRate.create).toHaveBeenCalledWith({
				data: {
					profileId: 'fr_1',
					label: 'Freight pallet',
					amountCents: 14900,
				},
			});
			expect(result.freight).toEqual(healedFreight);
		});
	});

	describe('upsertProfile FREIGHT flag invariants (PEM-211)', () => {
		it('forces shipsSeparately + ON_SHIPMENT even when upsert asks otherwise', async () => {
			const prisma = buildPrisma();
			const vendorAccess = buildVendorAccess();

			prisma.shippingProfile.upsert.mockResolvedValue({
				id: 'fr_1',
				vendorId: 'v1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
			});
			prisma.shippingProfile.findUniqueOrThrow.mockResolvedValue({
				id: 'fr_1',
				vendorId: 'v1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				rates: [],
			});

			const service = new ShippingService(
				prisma as never,
				vendorAccess as never,
			);

			await service.upsertProfile('user_1', 'v1', {
				code: 'FREIGHT',
				name: 'Freight',
				shipsSeparately: false,
				payoutTrigger: PayoutTrigger.ON_PAYMENT,
			});

			expect(prisma.shippingProfile.upsert).toHaveBeenCalledWith({
				where: {
					vendorId_code: { vendorId: 'v1', code: 'FREIGHT' },
				},
				create: {
					vendorId: 'v1',
					code: 'FREIGHT',
					name: 'Freight',
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				},
				update: {
					name: 'Freight',
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				},
			});
		});

		it('keeps ensure + upsert FREIGHT flags aligned after a conflicting upsert', async () => {
			const prisma = buildPrisma();
			const vendorAccess = buildVendorAccess();

			prisma.shippingProfile.upsert.mockResolvedValue({
				id: 'fr_1',
				vendorId: 'v1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
			});
			prisma.shippingProfile.findUniqueOrThrow.mockResolvedValue({
				id: 'fr_1',
				code: 'FREIGHT',
				shipsSeparately: true,
				payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				rates: [{ id: 'r_pallet', label: 'Freight pallet', amountCents: 14900 }],
			});

			const service = new ShippingService(
				prisma as never,
				vendorAccess as never,
			);

			await service.upsertProfile('user_1', 'v1', {
				code: 'freight',
				name: 'Freight',
				shipsSeparately: false,
				payoutTrigger: PayoutTrigger.ON_PAYMENT,
			});

			const upsertArgs = prisma.shippingProfile.upsert.mock.calls[0][0];
			expect(upsertArgs.create.shipsSeparately).toBe(true);
			expect(upsertArgs.create.payoutTrigger).toBe(
				PayoutTrigger.ON_SHIPMENT,
			);
			expect(upsertArgs.update.shipsSeparately).toBe(true);
			expect(upsertArgs.update.payoutTrigger).toBe(
				PayoutTrigger.ON_SHIPMENT,
			);

			prisma.shippingProfile.findUnique
				.mockResolvedValueOnce({
					id: 'std_1',
					vendorId: 'v1',
					code: 'STANDARD',
					rates: [{ id: 'r_ground', label: 'Ground', amountCents: 999 }],
				})
				.mockResolvedValueOnce({
					id: 'fr_1',
					vendorId: 'v1',
					code: 'FREIGHT',
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
					rates: [
						{
							id: 'r_pallet',
							label: 'Freight pallet',
							amountCents: 14900,
						},
					],
				});

			await service.ensureVendorDefaults('v1');

			expect(prisma.shippingProfile.update).not.toHaveBeenCalled();
		});
	});

	describe('upsertProfile rate replace-set', () => {
		it('rejects foreign rate.id with BadRequestException (no silent drop)', async () => {
			const prisma = buildPrisma();
			const vendorAccess = buildVendorAccess();

			prisma.shippingProfile.upsert.mockResolvedValue({
				id: 'prof_1',
				vendorId: 'v1',
				code: 'STANDARD',
			});
			prisma.__tx.shippingRate.updateMany.mockResolvedValue({ count: 0 });

			const service = new ShippingService(
				prisma as never,
				vendorAccess as never,
			);

			await expect(
				service.upsertProfile('user_1', 'v1', {
					code: 'STANDARD',
					name: 'Standard',
					rates: [
						{
							id: 'foreign_rate',
							label: 'Stolen',
							amountCents: 500,
						},
					],
				}),
			).rejects.toBeInstanceOf(BadRequestException);

			expect(prisma.$transaction).toHaveBeenCalledTimes(1);
			expect(prisma.__tx.shippingRate.updateMany).toHaveBeenCalledWith({
				where: { id: 'foreign_rate', profileId: 'prof_1' },
				data: {
					label: 'Stolen',
					amountCents: 500,
					minSubtotalCents: null,
					maxSubtotalCents: null,
				},
			});
			expect(prisma.__tx.shippingRate.deleteMany).not.toHaveBeenCalled();
			expect(prisma.__tx.shippingRate.create).not.toHaveBeenCalled();
		});

		it('runs rate updates, creates, and deletes inside one $transaction', async () => {
			const prisma = buildPrisma();
			const vendorAccess = buildVendorAccess();

			prisma.shippingProfile.upsert.mockResolvedValue({
				id: 'prof_1',
				vendorId: 'v1',
				code: 'STANDARD',
			});
			prisma.__tx.shippingRate.updateMany.mockResolvedValue({ count: 1 });
			prisma.__tx.shippingRate.create.mockResolvedValue({
				id: 'r_new',
				profileId: 'prof_1',
				label: 'Express',
				amountCents: 1999,
			});
			prisma.shippingProfile.findUniqueOrThrow.mockResolvedValue({
				id: 'prof_1',
				rates: [
					{ id: 'r_keep', label: 'Ground', amountCents: 999 },
					{ id: 'r_new', label: 'Express', amountCents: 1999 },
				],
			});

			const service = new ShippingService(
				prisma as never,
				vendorAccess as never,
			);

			await service.upsertProfile('user_1', 'v1', {
				code: 'STANDARD',
				name: 'Standard',
				rates: [
					{ id: 'r_keep', label: 'Ground', amountCents: 999 },
					{ label: 'Express', amountCents: 1999 },
				],
			});

			expect(prisma.$transaction).toHaveBeenCalledTimes(1);
			expect(prisma.__tx.shippingRate.updateMany).toHaveBeenCalledWith({
				where: { id: 'r_keep', profileId: 'prof_1' },
				data: {
					label: 'Ground',
					amountCents: 999,
					minSubtotalCents: null,
					maxSubtotalCents: null,
				},
			});
			expect(prisma.__tx.shippingRate.create).toHaveBeenCalledWith({
				data: {
					profileId: 'prof_1',
					label: 'Express',
					amountCents: 1999,
					minSubtotalCents: null,
					maxSubtotalCents: null,
				},
			});
			expect(prisma.__tx.shippingRate.deleteMany).toHaveBeenCalledWith({
				where: {
					profileId: 'prof_1',
					id: { notIn: ['r_keep', 'r_new'] },
				},
			});
			expect(prisma.shippingRate.updateMany).not.toHaveBeenCalled();
			expect(prisma.shippingRate.create).not.toHaveBeenCalled();
			expect(prisma.shippingRate.deleteMany).not.toHaveBeenCalled();
		});
	});
});
