import { BadRequestException } from '@nestjs/common';
import { BrokenPackStatus, InventoryClaimStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { InventoryService } from './inventory.service';

type TxClient = {
	inventoryClaim: {
		updateMany: jest.Mock;
	};
	productOffering: {
		findUnique: jest.Mock;
		updateMany: jest.Mock;
		update: jest.Mock;
	};
};

function buildPrisma() {
	const tx: TxClient = {
		inventoryClaim: {
			updateMany: jest.fn(),
		},
		productOffering: {
			findUnique: jest.fn(),
			updateMany: jest.fn(),
			update: jest.fn(),
		},
	};

	const prisma = {
		inventoryClaim: {
			findMany: jest.fn(),
			updateMany: jest.fn(),
			aggregate: jest.fn().mockResolvedValue({ _sum: { quantity: null } }),
		},
		productOffering: {
			findUnique: jest.fn(),
			findMany: jest.fn().mockResolvedValue([]),
			update: jest.fn(),
			updateMany: jest.fn(),
		},
		catalogProduct: {
			findFirst: jest.fn().mockResolvedValue(null),
		},
		brokenPack: {
			findUnique: jest.fn(),
			update: jest.fn(),
			create: jest.fn(),
		},
		offeringContainment: {
			findMany: jest.fn().mockResolvedValue([]),
		},
		$transaction: jest.fn(async (fn: (client: TxClient) => Promise<unknown>) => fn(tx)),
		__tx: tx,
	};

	return prisma;
}

describe('InventoryService CAS / oversell (PEM-198)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('fulfillClaimsForOrder', () => {
		it('CAS PENDING→FULFILLED and decrements when stock covers claim', async () => {
			const prisma = buildPrisma();
			prisma.inventoryClaim.findMany.mockResolvedValue([
				{
					id: 'claim_1',
					orderId: 'ord_1',
					offeringId: 'off_1',
					quantity: new Decimal(2),
					status: InventoryClaimStatus.PENDING,
				},
			]);
			prisma.__tx.inventoryClaim.updateMany.mockResolvedValue({ count: 1 });
			prisma.__tx.productOffering.findUnique.mockResolvedValue({
				id: 'off_1',
				tracksOwnQty: true,
				qtyOnHand: new Decimal(5),
			});
			prisma.__tx.productOffering.updateMany.mockResolvedValue({ count: 1 });

			const service = new InventoryService(prisma as never);
			const result = await service.fulfillClaimsForOrder('ord_1');

			expect(result).toEqual({ fulfilled: 1 });
			expect(prisma.__tx.inventoryClaim.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'claim_1',
					status: InventoryClaimStatus.PENDING,
				},
				data: { status: InventoryClaimStatus.FULFILLED },
			});
			const qtyArgs = prisma.__tx.productOffering.updateMany.mock.calls[0][0];
			expect(qtyArgs.where.id).toBe('off_1');
			expect(qtyArgs.where.qtyOnHand.gte.toString()).toBe('2');
			expect(qtyArgs.data.qtyOnHand.decrement.toString()).toBe('2');
		});

		it('rejects fulfill when qty is short instead of clamping and fulfilling', async () => {
			const prisma = buildPrisma();
			prisma.inventoryClaim.findMany.mockResolvedValue([
				{
					id: 'claim_short',
					orderId: 'ord_1',
					offeringId: 'off_1',
					quantity: new Decimal(4),
					status: InventoryClaimStatus.PENDING,
				},
			]);
			prisma.__tx.inventoryClaim.updateMany.mockResolvedValue({ count: 1 });
			prisma.__tx.productOffering.findUnique.mockResolvedValue({
				id: 'off_1',
				tracksOwnQty: true,
				qtyOnHand: new Decimal(1),
			});
			prisma.__tx.productOffering.updateMany.mockResolvedValue({ count: 0 });

			const service = new InventoryService(prisma as never);

			await expect(service.fulfillClaimsForOrder('ord_1')).rejects.toBeInstanceOf(
				BadRequestException,
			);
			expect(prisma.__tx.productOffering.update).not.toHaveBeenCalled();
		});

		it('skips qty decrement when status CAS loses to concurrent release', async () => {
			const prisma = buildPrisma();
			prisma.inventoryClaim.findMany.mockResolvedValue([
				{
					id: 'claim_race',
					orderId: 'ord_1',
					offeringId: 'off_1',
					quantity: new Decimal(1),
					status: InventoryClaimStatus.PENDING,
				},
			]);
			prisma.__tx.inventoryClaim.updateMany.mockResolvedValue({ count: 0 });

			const service = new InventoryService(prisma as never);
			const result = await service.fulfillClaimsForOrder('ord_1');

			expect(result).toEqual({ fulfilled: 0 });
			expect(prisma.__tx.productOffering.findUnique).not.toHaveBeenCalled();
			expect(prisma.__tx.productOffering.updateMany).not.toHaveBeenCalled();
		});
	});

	describe('restockClaimsForOrder', () => {
		it('CAS FULFILLED→RELEASED before restocking qty', async () => {
			const prisma = buildPrisma();
			prisma.inventoryClaim.findMany.mockResolvedValue([
				{
					id: 'claim_f',
					orderId: 'ord_1',
					offeringId: 'off_1',
					quantity: new Decimal(3),
					status: InventoryClaimStatus.FULFILLED,
				},
			]);
			prisma.__tx.inventoryClaim.updateMany.mockResolvedValue({ count: 1 });
			prisma.__tx.productOffering.findUnique.mockResolvedValue({
				id: 'off_1',
				tracksOwnQty: true,
				qtyOnHand: new Decimal(2),
			});
			prisma.__tx.productOffering.update.mockResolvedValue({});

			const service = new InventoryService(prisma as never);
			const result = await service.restockClaimsForOrder('ord_1');

			expect(result).toEqual({ restocked: 1, released: 0 });
			expect(prisma.__tx.inventoryClaim.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'claim_f',
					status: InventoryClaimStatus.FULFILLED,
				},
				data: { status: InventoryClaimStatus.RELEASED },
			});
			const restockArgs = prisma.__tx.productOffering.update.mock.calls[0][0];
			expect(restockArgs.where).toEqual({ id: 'off_1' });
			expect(restockArgs.data.qtyOnHand.toString()).toBe('5');
		});

		it('does not double-add qty when restock CAS loses', async () => {
			const prisma = buildPrisma();
			prisma.inventoryClaim.findMany.mockResolvedValue([
				{
					id: 'claim_f',
					orderId: 'ord_1',
					offeringId: 'off_1',
					quantity: new Decimal(3),
					status: InventoryClaimStatus.FULFILLED,
				},
			]);
			prisma.__tx.inventoryClaim.updateMany.mockResolvedValue({ count: 0 });

			const service = new InventoryService(prisma as never);
			const result = await service.restockClaimsForOrder('ord_1');

			expect(result).toEqual({ restocked: 0, released: 0 });
			expect(prisma.__tx.productOffering.findUnique).not.toHaveBeenCalled();
			expect(prisma.__tx.productOffering.update).not.toHaveBeenCalled();
		});

		it('CAS PENDING→RELEASED for pending claims on restock', async () => {
			const prisma = buildPrisma();
			prisma.inventoryClaim.findMany.mockResolvedValue([
				{
					id: 'claim_p',
					orderId: 'ord_1',
					offeringId: 'off_1',
					quantity: new Decimal(1),
					status: InventoryClaimStatus.PENDING,
				},
			]);
			prisma.inventoryClaim.updateMany.mockResolvedValue({ count: 1 });

			const service = new InventoryService(prisma as never);
			const result = await service.restockClaimsForOrder('ord_1');

			expect(result).toEqual({ restocked: 0, released: 1 });
			expect(prisma.inventoryClaim.updateMany).toHaveBeenCalledWith({
				where: {
					id: 'claim_p',
					status: InventoryClaimStatus.PENDING,
				},
				data: { status: InventoryClaimStatus.RELEASED },
			});
		});
	});

	describe('applyTrimAllocations floor', () => {
		it('floors whole-pack qtyOnHand to zero instead of bare negative decrement', async () => {
			const prisma = buildPrisma();
			prisma.productOffering.updateMany
				.mockResolvedValueOnce({ count: 0 })
				.mockResolvedValueOnce({ count: 1 });

			const service = new InventoryService(prisma as never);
			await (
				service as unknown as {
					applyTrimAllocations: (
						parentOfferingId: string,
						childQtyPerParent: Decimal,
						allocations: Array<{
							supplyId: string;
							kind: 'whole' | 'broken';
							takeInPieceUom: Decimal;
						}>,
					) => Promise<void>;
				}
			).applyTrimAllocations('parent_1', new Decimal(10), [
				{
					supplyId: 'parent_1',
					kind: 'whole',
					takeInPieceUom: new Decimal(10),
				},
			]);

			const first = prisma.productOffering.updateMany.mock.calls[0][0];
			expect(first.where.id).toBe('parent_1');
			expect(first.where.qtyOnHand.gte.toString()).toBe('1');
			expect(first.data.qtyOnHand.decrement.toString()).toBe('1');
			const floor = prisma.productOffering.updateMany.mock.calls[1][0];
			expect(floor.where).toEqual({ id: 'parent_1' });
			expect(floor.data.qtyOnHand.toString()).toBe('0');
		});

		it('floors broken-pack remainder at zero', async () => {
			const prisma = buildPrisma();
			prisma.brokenPack.findUnique.mockResolvedValue({
				id: 'bp_1',
				remainingQty: new Decimal(2),
				status: BrokenPackStatus.ACTIVE,
			});
			prisma.brokenPack.update.mockResolvedValue({});

			const service = new InventoryService(prisma as never);
			await (
				service as unknown as {
					applyTrimAllocations: (
						parentOfferingId: string,
						childQtyPerParent: Decimal,
						allocations: Array<{
							supplyId: string;
							kind: 'whole' | 'broken';
							takeInPieceUom: Decimal;
						}>,
					) => Promise<void>;
				}
			).applyTrimAllocations('parent_1', new Decimal(10), [
				{
					supplyId: 'bp_1',
					kind: 'broken',
					takeInPieceUom: new Decimal(5),
				},
			]);

			const brokenArgs = prisma.brokenPack.update.mock.calls[0][0];
			expect(brokenArgs.where).toEqual({ id: 'bp_1' });
			expect(brokenArgs.data.remainingQty.toString()).toBe('0');
			expect(brokenArgs.data.status).toBe(BrokenPackStatus.DEPLETED);
		});
	});
});
