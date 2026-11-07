import { BadRequestException } from '@nestjs/common';
import {
	OrderRefundReason,
	OrderRefundStatus,
	PlaceEtMarqueOrderStatus,
	VendorMemberRole,
	VendorPayoutStatus,
} from '@prisma/client';
import { RefundService } from './refund.service';

type StripeCall = 'createRefund' | 'reverseTransfer';

function buildOrder(overrides?: {
	payoutStatus?: VendorPayoutStatus;
	stripeTransferReversalId?: string | null;
}) {
	const payoutStatus =
		overrides?.payoutStatus ?? VendorPayoutStatus.TRANSFERRED;
	return {
		id: 'ord_1',
		orderRef: 'ord_1',
		status: PlaceEtMarqueOrderStatus.SHIPPED,
		buyerId: 'buyer_1',
		vendorId: 'vendor_1',
		checkoutId: 'chk_1',
		currency: 'USD',
		merchandiseCents: 1000,
		shippingCents: 0,
		totalCents: 1000,
		feeCents: 100,
		vendorNetCents: 900,
		stripeTransferId: 'tr_order',
		checkout: {
			id: 'chk_1',
			stripePaymentIntentId: 'pi_1',
			refundedCents: 0,
			totalCents: 1000,
		},
		payout: {
			id: 'payout_1',
			status: payoutStatus,
			stripeTransferId: 'tr_1',
			vendorNetCents: 900,
			stripeTransferReversalId:
				overrides?.stripeTransferReversalId ?? null,
		},
		refunds: [] as Array<{ id: string; status: OrderRefundStatus }>,
	};
}

describe('RefundService clawback ordering', () => {
	const callOrder: StripeCall[] = [];
	let payoutUpdates: Array<Record<string, unknown>>;
	let refundUpdates: Array<Record<string, unknown>>;
	let refundRow: {
		id: string;
		orderId: string;
		reason: OrderRefundReason;
		note: string | null;
		status: OrderRefundStatus;
		currency: string;
		merchandiseCents: number;
		shippingCents: number;
		feeCents: number;
		buyerRefundCents: number;
		vendorReversalCents: number;
		stripeRefundId: string | null;
		stripeTransferReversalId: string | null;
		lastError: string | null;
		succeededAt: Date | null;
		createdAt: Date;
	};

	let prisma: {
		vendorMember: { findUnique: jest.Mock };
		placeEtMarqueOrder: {
			findFirst: jest.Mock;
			update: jest.Mock;
		};
		orderRefund: {
			create: jest.Mock;
			update: jest.Mock;
			findUniqueOrThrow: jest.Mock;
		};
		vendorPayout: { update: jest.Mock };
		checkout: { update: jest.Mock };
		$transaction: jest.Mock;
	};
	let stripe: {
		enabled: boolean;
		createRefund: jest.Mock;
		reverseTransfer: jest.Mock;
	};
	let inventory: { restockClaimsForOrder: jest.Mock };
	let service: RefundService;

	beforeEach(() => {
		callOrder.length = 0;
		payoutUpdates = [];
		refundUpdates = [];
		refundRow = {
			id: 'refund_1',
			orderId: 'ord_1',
			reason: OrderRefundReason.VENDOR_REFUND,
			note: null,
			status: OrderRefundStatus.PENDING,
			currency: 'USD',
			merchandiseCents: 1000,
			shippingCents: 0,
			feeCents: 100,
			buyerRefundCents: 1000,
			vendorReversalCents: 900,
			stripeRefundId: null,
			stripeTransferReversalId: null,
			lastError: null,
			succeededAt: null,
			createdAt: new Date('2026-11-07T00:00:00.000Z'),
		};

		prisma = {
			vendorMember: {
				findUnique: jest.fn().mockResolvedValue({
					role: VendorMemberRole.OWNER,
				}),
			},
			placeEtMarqueOrder: {
				findFirst: jest.fn().mockResolvedValue(buildOrder()),
				update: jest.fn().mockResolvedValue({}),
			},
			orderRefund: {
				create: jest.fn().mockImplementation(async ({ data }) => {
					refundRow = {
						...refundRow,
						...data,
						id: 'refund_1',
						createdAt: refundRow.createdAt,
					};
					return refundRow;
				}),
				update: jest.fn().mockImplementation(async ({ data }) => {
					refundUpdates.push(data);
					refundRow = { ...refundRow, ...data };
					return refundRow;
				}),
				findUniqueOrThrow: jest.fn().mockImplementation(async () => refundRow),
			},
			vendorPayout: {
				update: jest.fn().mockImplementation(async ({ data }) => {
					payoutUpdates.push(data);
					return data;
				}),
			},
			checkout: {
				update: jest.fn().mockResolvedValue({}),
			},
			$transaction: jest.fn().mockImplementation(async (fn) =>
				fn({
					orderRefund: prisma.orderRefund,
					placeEtMarqueOrder: prisma.placeEtMarqueOrder,
					checkout: prisma.checkout,
				}),
			),
		};

		stripe = {
			enabled: true,
			createRefund: jest.fn().mockImplementation(async () => {
				callOrder.push('createRefund');
				return { id: 're_1' };
			}),
			reverseTransfer: jest.fn().mockImplementation(async () => {
				callOrder.push('reverseTransfer');
				return { id: 'trr_1' };
			}),
		};

		inventory = {
			restockClaimsForOrder: jest.fn().mockResolvedValue(undefined),
		};

		service = new RefundService(
			prisma as never,
			stripe as never,
			inventory as never,
		);
	});

	it('calls Stripe createRefund before reverseTransfer on transferred payout', async () => {
		const result = await service.refundAsVendor(
			'user_1',
			'vendor_1',
			'ord_1',
		);

		expect(callOrder).toEqual(['createRefund', 'reverseTransfer']);
		expect(result.status).toBe(OrderRefundStatus.SUCCEEDED);
		expect(result.stripeRefundId).toBe('re_1');
		expect(result.stripeTransferReversalId).toBe('trr_1');
		expect(payoutUpdates).toContainEqual(
			expect.objectContaining({
				status: VendorPayoutStatus.REVERSED,
				stripeTransferReversalId: 'trr_1',
			}),
		);
	});

	it('does not reverse transfer when createRefund throws', async () => {
		stripe.createRefund.mockImplementation(async () => {
			callOrder.push('createRefund');
			throw new Error('stripe refund boom');
		});

		await expect(
			service.refundAsVendor('user_1', 'vendor_1', 'ord_1'),
		).rejects.toBeInstanceOf(BadRequestException);

		expect(callOrder).toEqual(['createRefund']);
		expect(stripe.reverseTransfer).not.toHaveBeenCalled();
		expect(payoutUpdates).toEqual([]);
		expect(refundUpdates.at(-1)).toEqual(
			expect.objectContaining({
				status: OrderRefundStatus.FAILED,
				stripeRefundId: null,
				stripeTransferReversalId: null,
			}),
		);
	});

	it('keeps buyer refund succeeded when reverseTransfer throws after refund', async () => {
		stripe.reverseTransfer.mockImplementation(async () => {
			callOrder.push('reverseTransfer');
			throw new Error('stripe reverse boom');
		});

		const result = await service.refundAsVendor(
			'user_1',
			'vendor_1',
			'ord_1',
		);

		expect(callOrder).toEqual(['createRefund', 'reverseTransfer']);
		expect(result.status).toBe(OrderRefundStatus.SUCCEEDED);
		expect(result.stripeRefundId).toBe('re_1');
		expect(result.stripeTransferReversalId).toBeNull();
		expect(result.lastError).toMatch(/stripe reverse boom/i);
		expect(
			payoutUpdates.some(
				(row) => row.status === VendorPayoutStatus.REVERSED,
			),
		).toBe(false);
		expect(payoutUpdates).toContainEqual(
			expect.objectContaining({
				lastError: expect.stringMatching(/stripe reverse boom/i),
			}),
		);
	});
});
