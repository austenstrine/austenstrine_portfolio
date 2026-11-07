import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import {
	PlaceEtMarqueOrderStatus,
	OrderRefundReason,
	OrderRefundStatus,
	VendorMemberRole,
	VendorPayoutStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InventoryService } from '../catalog/inventory/inventory.service';
import { StripeService } from './stripe.service';

const BUYER_CANCEL_STATUSES: PlaceEtMarqueOrderStatus[] = [
	PlaceEtMarqueOrderStatus.PAID,
	PlaceEtMarqueOrderStatus.FULFILLING,
];

const VENDOR_REFUND_STATUSES: PlaceEtMarqueOrderStatus[] = [
	PlaceEtMarqueOrderStatus.PAID,
	PlaceEtMarqueOrderStatus.FULFILLING,
	PlaceEtMarqueOrderStatus.SHIPPED,
];

/** Load in-flight/done refunds plus any row that already hit Stripe (blocks retry). */
const REFUND_LOAD_WHERE = {
	OR: [
		{
			status: {
				in: [OrderRefundStatus.PENDING, OrderRefundStatus.SUCCEEDED],
			},
		},
		{ stripeRefundId: { not: null } },
	],
};

@Injectable()
export class RefundService {
	private readonly logger = new Logger(RefundService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly stripe: StripeService,
		private readonly inventory: InventoryService,
	) {}

	async cancelAsBuyer(userId: string, orderId: string, note?: string) {
		const order = await this.prisma.placeEtMarqueOrder.findFirst({
			where: { id: orderId, buyerId: userId },
			include: {
				payout: true,
				checkout: true,
				refunds: {
					where: REFUND_LOAD_WHERE,
				},
			},
		});
		if(!order) {
			throw new NotFoundException('Order not found.');
		}
		if(!BUYER_CANCEL_STATUSES.includes(order.status)) {
			throw new BadRequestException(
				'Only unshipped paid orders can be cancelled by the buyer.',
			);
		}

		return this.executeFullRefund({
			order,
			userId,
			reason: OrderRefundReason.BUYER_CANCEL,
			note,
		});
	}

	async refundAsVendor(
		userId: string,
		vendorId: string,
		orderId: string,
		input?: { note?: string; asCancel?: boolean },
	) {
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: { vendorId, userId },
			},
		});
		if(
			!membership ||
			(
				membership.role !== VendorMemberRole.OWNER &&
				membership.role !== VendorMemberRole.EDITOR
			)
		) {
			throw new ForbiddenException('Not allowed to refund vendor orders.');
		}

		const order = await this.prisma.placeEtMarqueOrder.findFirst({
			where: { id: orderId, vendorId },
			include: {
				payout: true,
				checkout: true,
				refunds: {
					where: REFUND_LOAD_WHERE,
				},
			},
		});
		if(!order) {
			throw new NotFoundException('Order not found.');
		}
		if(!VENDOR_REFUND_STATUSES.includes(order.status)) {
			throw new BadRequestException(
				'Order is not eligible for a vendor refund.',
			);
		}

		return this.executeFullRefund({
			order,
			userId,
			reason: input?.asCancel
				? OrderRefundReason.VENDOR_CANCEL
				: OrderRefundReason.VENDOR_REFUND,
			note: input?.note,
		});
	}

	private async executeFullRefund(input: {
		order: {
			id: string;
			orderRef: string;
			status: PlaceEtMarqueOrderStatus;
			buyerId: string | null;
			vendorId: string | null;
			checkoutId: string | null;
			currency: string;
			merchandiseCents: number;
			shippingCents: number;
			totalCents: number;
			feeCents: number;
			vendorNetCents: number;
			stripeTransferId: string | null;
			checkout: {
				id: string;
				stripePaymentIntentId: string | null;
				refundedCents: number;
				totalCents: number;
			} | null;
			payout: {
				id: string;
				status: VendorPayoutStatus;
				stripeTransferId: string | null;
				vendorNetCents: number;
				stripeTransferReversalId: string | null;
			} | null;
			refunds: Array<{
				id: string;
				status: OrderRefundStatus;
				stripeRefundId: string | null;
			}>;
		};
		userId: string;
		reason: OrderRefundReason;
		note?: string;
	}) {
		const { order } = input;

		if(
			order.refunds.some(
				(row) =>
					row.status === OrderRefundStatus.SUCCEEDED ||
					Boolean(row.stripeRefundId),
			)
		) {
			throw new BadRequestException(
				order.refunds.some(
					(row) => row.status === OrderRefundStatus.SUCCEEDED,
				)
					? 'Order is already refunded.'
					: 'A Stripe refund was already recorded for this order; refusing another attempt to avoid double-refund.',
			);
		}
		const pending = order.refunds.find(
			(row) => row.status === OrderRefundStatus.PENDING,
		);
		if(pending) {
			throw new BadRequestException(
				'A refund is already in progress for this order.',
			);
		}

		if(!this.stripe.enabled) {
			throw new BadRequestException(
				'Stripe is not configured on the server (STRIPE_SECRET_KEY).',
			);
		}

		const paymentIntentId = order.checkout?.stripePaymentIntentId;
		if(!paymentIntentId) {
			throw new BadRequestException(
				'Checkout payment intent is missing; cannot refund.',
			);
		}

		const buyerRefundCents = order.totalCents;
		if(buyerRefundCents <= 0) {
			throw new BadRequestException('Nothing to refund on this order.');
		}

		const checkoutRefunded = order.checkout?.refundedCents ?? 0;
		const checkoutTotal = order.checkout?.totalCents ?? buyerRefundCents;
		if(checkoutRefunded + buyerRefundCents > checkoutTotal) {
			throw new BadRequestException(
				'Refund would exceed the original checkout charge.',
			);
		}

		const vendorReversalCents =
			order.payout?.status === VendorPayoutStatus.TRANSFERRED
				? order.payout.vendorNetCents
				: 0;

		const refundRow = await this.prisma.orderRefund.create({
			data: {
				orderId: order.id,
				checkoutId: order.checkoutId,
				initiatedByUserId: input.userId,
				reason: input.reason,
				note: input.note?.trim() || null,
				status: OrderRefundStatus.PENDING,
				currency: order.currency,
				merchandiseCents: order.merchandiseCents,
				shippingCents: order.shippingCents,
				feeCents: order.feeCents,
				buyerRefundCents,
				vendorReversalCents,
			},
		});

		let stripeRefundId: string | null = null;
		let stripeTransferReversalId: string | null =
			order.payout?.stripeTransferReversalId ?? null;

		try {
			// Stripe order: buyer refund first, then vendor transfer reverse.
			// Reversing before createRefund left payout REVERSED when refund threw
			// (vendor clawed back, buyer unpaid). Refund and transfer reversal are
			// independent Stripe calls; refund-first keeps clawback from succeeding
			// without a buyer refund. If reverse fails after refund, buyer refund
			// still completes and payout stays consistent for ops retry.
			const stripeRefund = await this.stripe.createRefund({
				paymentIntentId,
				amountCents: buyerRefundCents,
				orderId: order.id,
				refundId: refundRow.id,
				reason:
					input.reason === OrderRefundReason.BUYER_CANCEL
						? 'requested_by_customer'
						: undefined,
			});
			stripeRefundId = stripeRefund.id;

			let clawbackWarning: string | null = null;
			try {
				if(
					order.payout &&
					order.payout.status === VendorPayoutStatus.TRANSFERRED
				) {
					const transferId =
						order.payout.stripeTransferId ?? order.stripeTransferId;
					if(!transferId) {
						throw new Error(
							'Vendor payout was transferred but no Stripe transfer id is stored.',
						);
					}
					if(!stripeTransferReversalId) {
						const reversal = await this.stripe.reverseTransfer({
							transferId,
							amountCents: vendorReversalCents,
							orderId: order.id,
							refundId: refundRow.id,
						});
						stripeTransferReversalId = reversal.id;
						await this.prisma.vendorPayout.update({
							where: { id: order.payout.id },
							data: {
								status: VendorPayoutStatus.REVERSED,
								stripeTransferReversalId,
								reversedAt: new Date(),
								lastError: null,
							},
						});
					}
				}
				else if(order.payout) {
					const cancellable: VendorPayoutStatus[] = [
						VendorPayoutStatus.PENDING,
						VendorPayoutStatus.READY,
						VendorPayoutStatus.FAILED,
						VendorPayoutStatus.SKIPPED,
					];
					if(cancellable.includes(order.payout.status)) {
						await this.prisma.vendorPayout.update({
							where: { id: order.payout.id },
							data: {
								status: VendorPayoutStatus.CANCELLED,
								lastError: null,
							},
						});
					}
				}
			}
			catch(clawbackError) {
				clawbackWarning =
					clawbackError instanceof Error
						? clawbackError.message
						: 'Vendor clawback failed after buyer refund.';
				this.logger.error(
					`Buyer refund ${stripeRefundId} succeeded for order ${order.id} but vendor clawback failed: ${clawbackWarning}`,
					clawbackError as Error,
				);
				if(
					order.payout &&
					order.payout.status === VendorPayoutStatus.TRANSFERRED
				) {
					await this.prisma.vendorPayout.update({
						where: { id: order.payout.id },
						data: {
							lastError: clawbackWarning.slice(0, 1000),
						},
					});
				}
			}

			let localWarning = clawbackWarning;
			try {
				await this.inventory.restockClaimsForOrder(order.id);
			}
			catch(restockError) {
				localWarning =
					restockError instanceof Error
						? restockError.message
						: 'Inventory restock failed after buyer refund.';
				this.logger.error(
					`Buyer refund ${stripeRefundId} succeeded for order ${order.id} but restock failed: ${localWarning}`,
					restockError as Error,
				);
			}

			// Once Stripe createRefund has landed, always persist SUCCEEDED.
			// Marking FAILED here would drop the row from the PENDING|SUCCEEDED
			// load filter and let a retry mint a new refund id / idempotency key.
			await this.persistBuyerRefundSucceeded({
				refundId: refundRow.id,
				orderId: order.id,
				checkoutId: order.checkoutId,
				buyerRefundCents,
				reason: input.reason,
				stripeRefundId,
				stripeTransferReversalId,
				lastError: localWarning,
			});

			return this.toRefundDto(
				await this.prisma.orderRefund.findUniqueOrThrow({
					where: { id: refundRow.id },
				}),
			);
		}
		catch(error) {
			const message =
				error instanceof Error ? error.message : 'Refund failed.';
			this.logger.error(
				`Order refund failed for ${order.id}: ${message}`,
				error as Error,
			);
			if(stripeRefundId) {
				// Stripe already moved buyer money — never leave a retryable FAILED.
				try {
					await this.persistBuyerRefundSucceeded({
						refundId: refundRow.id,
						orderId: order.id,
						checkoutId: order.checkoutId,
						buyerRefundCents,
						reason: input.reason,
						stripeRefundId,
						stripeTransferReversalId,
						lastError: message,
					});
				}
				catch(persistError) {
					this.logger.error(
						`Failed to persist SUCCEEDED after Stripe refund ${stripeRefundId} for order ${order.id}`,
						persistError as Error,
					);
					await this.prisma.orderRefund.update({
						where: { id: refundRow.id },
						data: {
							status: OrderRefundStatus.SUCCEEDED,
							stripeRefundId,
							stripeTransferReversalId,
							succeededAt: new Date(),
							lastError: message.slice(0, 1000),
						},
					});
				}
				throw new BadRequestException(message);
			}
			await this.prisma.orderRefund.update({
				where: { id: refundRow.id },
				data: {
					status: OrderRefundStatus.FAILED,
					stripeRefundId,
					stripeTransferReversalId,
					lastError: message.slice(0, 1000),
				},
			});
			throw new BadRequestException(message);
		}
	}

	private async persistBuyerRefundSucceeded(input: {
		refundId: string;
		orderId: string;
		checkoutId: string | null;
		buyerRefundCents: number;
		reason: OrderRefundReason;
		stripeRefundId: string;
		stripeTransferReversalId: string | null;
		lastError: string | null;
	}) {
		const now = new Date();
		await this.prisma.$transaction(async (tx) => {
			await tx.orderRefund.update({
				where: { id: input.refundId },
				data: {
					status: OrderRefundStatus.SUCCEEDED,
					stripeRefundId: input.stripeRefundId,
					stripeTransferReversalId: input.stripeTransferReversalId,
					succeededAt: now,
					lastError: input.lastError
						? input.lastError.slice(0, 1000)
						: null,
				},
			});
			await tx.placeEtMarqueOrder.update({
				where: { id: input.orderId },
				data: {
					status: PlaceEtMarqueOrderStatus.REFUNDED,
					refundedAt: now,
					cancelledAt:
						input.reason === OrderRefundReason.BUYER_CANCEL ||
						input.reason === OrderRefundReason.VENDOR_CANCEL
							? now
							: undefined,
				},
			});
			if(input.checkoutId) {
				await tx.checkout.update({
					where: { id: input.checkoutId },
					data: {
						refundedCents: { increment: input.buyerRefundCents },
					},
				});
			}
		});
	}

	async listOrderRefunds(orderId: string) {
		const rows = await this.prisma.orderRefund.findMany({
			where: { orderId },
			orderBy: { createdAt: 'desc' },
		});
		return rows.map((row) => this.toRefundDto(row));
	}

	private toRefundDto(row: {
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
	}) {
		return {
			id: row.id,
			orderId: row.orderId,
			reason: row.reason,
			note: row.note,
			status: row.status,
			currency: row.currency,
			merchandiseCents: row.merchandiseCents,
			shippingCents: row.shippingCents,
			feeCents: row.feeCents,
			buyerRefundCents: row.buyerRefundCents,
			vendorReversalCents: row.vendorReversalCents,
			stripeRefundId: row.stripeRefundId,
			stripeTransferReversalId: row.stripeTransferReversalId,
			lastError: row.lastError,
			succeededAt: row.succeededAt,
			createdAt: row.createdAt,
		};
	}
}
