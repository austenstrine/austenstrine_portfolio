import {
	Injectable,
	Logger,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import {
	PlaceEtMarqueOrderStatus,
	PayoutTrigger,
	VendorPayoutStatus,
} from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { computeMerchandiseFee } from './fee-math';
import { StripeService } from './stripe.service';

const PLATFORM_FEE_CONFIG_ID = 'platform-default';
const PAYOUT_SWEEP_MS = 1000 * 60 * 2;
const MAX_ATTEMPTS = 12;
const BACKOFF_BASE_MS = 1000 * 60;

@Injectable()
export class PayoutService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(PayoutService.name);
	private sweepTimer: NodeJS.Timeout | null = null;

	constructor(
		private readonly prisma: PrismaService,
		private readonly stripe: StripeService,
	) {}

	onModuleInit() {
		void this.ensurePlatformFeeConfig().catch((error) => {
			this.logger.error('Platform fee config bootstrap failed', error as Error);
		});
		void this.retryEligiblePayouts().catch((error) => {
			this.logger.error('Initial payout sweep failed', error as Error);
		});
		this.sweepTimer = setInterval(() => {
			void this.retryEligiblePayouts().catch((error) => {
				this.logger.error('Payout sweep failed', error as Error);
			});
		}, PAYOUT_SWEEP_MS);
		this.sweepTimer.unref?.();
	}

	onModuleDestroy() {
		if(this.sweepTimer) {
			clearInterval(this.sweepTimer);
			this.sweepTimer = null;
		}
	}

	async ensurePlatformFeeConfig() {
		const bpsEnv = process.env.PLATFORM_FEE_BPS;
		const flatEnv = process.env.PLATFORM_FLAT_FEE_CENTS;
		const merchandiseFeeBps =
			bpsEnv != null && bpsEnv !== ''
				? Math.max(0, Number.parseInt(bpsEnv, 10) || 1000)
				: 1000;
		const flatFeeCents =
			flatEnv != null && flatEnv !== ''
				? Math.max(0, Number.parseInt(flatEnv, 10) || 0)
				: 0;

		const existing = await this.prisma.platformFeeConfig.findUnique({
			where: { id: PLATFORM_FEE_CONFIG_ID },
		});

		if(!existing) {
			return this.prisma.platformFeeConfig.create({
				data: {
					id: PLATFORM_FEE_CONFIG_ID,
					merchandiseFeeBps,
					flatFeeCents,
					currency: 'USD',
				},
			});
		}

		// Only apply env overrides when explicitly set (avoid clobbering DB edits on every boot)
		if(bpsEnv != null && bpsEnv !== '' || flatEnv != null && flatEnv !== '') {
			return this.prisma.platformFeeConfig.update({
				where: { id: PLATFORM_FEE_CONFIG_ID },
				data: {
					...(bpsEnv != null && bpsEnv !== ''
						? { merchandiseFeeBps }
						: {}),
					...(flatEnv != null && flatEnv !== ''
						? { flatFeeCents }
						: {}),
				},
			});
		}

		return existing;
	}

	async getPlatformFeeConfig() {
		const config = await this.ensurePlatformFeeConfig();
		return {
			id: config.id,
			merchandiseFeeBps: config.merchandiseFeeBps,
			flatFeeCents: config.flatFeeCents,
			currency: config.currency,
			updatedAt: config.updatedAt,
		};
	}

	async updatePlatformFeeConfig(input: {
		merchandiseFeeBps?: number;
		flatFeeCents?: number;
	}) {
		await this.ensurePlatformFeeConfig();
		return this.prisma.platformFeeConfig.update({
			where: { id: PLATFORM_FEE_CONFIG_ID },
			data: {
				...(input.merchandiseFeeBps != null
					? { merchandiseFeeBps: Math.max(0, Math.floor(input.merchandiseFeeBps)) }
					: {}),
				...(input.flatFeeCents != null
					? { flatFeeCents: Math.max(0, Math.floor(input.flatFeeCents)) }
					: {}),
			},
		});
	}

	async createPayoutForPaidOrder(orderId: string) {
		const order = await this.prisma.placeEtMarqueOrder.findUnique({
			where: { id: orderId },
			include: {
				vendor: true,
				shippingProfile: true,
				payout: true,
			},
		});
		if(!order) {
			return null;
		}
		if(order.payout) {
			return order.payout;
		}
		if(!order.vendorId || !order.vendor) {
			this.logger.error(`Cannot create payout for order ${orderId}: missing vendor`);
			return null;
		}

		const vendor = order.vendor;
		const trigger =
			order.payoutTrigger ??
			order.shippingProfile?.payoutTrigger ??
			(order.shippingProfile?.shipsSeparately
				? PayoutTrigger.ON_SHIPMENT
				: PayoutTrigger.ON_PAYMENT);

		const feeConfig = await this.ensurePlatformFeeConfig();
		const bps =
			vendor.platformFeeBpsOverride ?? feeConfig.merchandiseFeeBps;
		const { feeCents, vendorNetCents } = computeMerchandiseFee({
			merchandiseCents: order.merchandiseCents,
			shippingCents: order.shippingCents,
			merchandiseFeeBps: bps,
			flatFeeCents: feeConfig.flatFeeCents,
		});

		await this.prisma.placeEtMarqueOrder.update({
			where: { id: order.id },
			data: {
				feeCents,
				vendorNetCents,
				payoutTrigger: trigger,
			},
		});

		if(vendorNetCents <= 0) {
			return this.prisma.vendorPayout.create({
				data: {
					orderId: order.id,
					vendorId: order.vendorId,
					checkoutId: order.checkoutId ?? undefined,
					merchandiseCents: order.merchandiseCents,
					shippingCents: order.shippingCents,
					feeCents,
					vendorNetCents,
					currency: order.currency,
					status: VendorPayoutStatus.SKIPPED,
					trigger,
					readyAt: new Date(),
				},
			});
		}

		const canPayNow =
			trigger === PayoutTrigger.ON_PAYMENT &&
			Boolean(vendor.stripeConnectAccountId) &&
			vendor.stripePayoutsEnabled;

		const payout = await this.prisma.vendorPayout.create({
			data: {
				orderId: order.id,
				vendorId: order.vendorId,
				checkoutId: order.checkoutId ?? undefined,
				merchandiseCents: order.merchandiseCents,
				shippingCents: order.shippingCents,
				feeCents,
				vendorNetCents,
				currency: order.currency,
				status: canPayNow
					? VendorPayoutStatus.READY
					: VendorPayoutStatus.PENDING,
				trigger,
				readyAt: canPayNow ? new Date() : null,
			},
		});

		if(canPayNow) {
			return this.attemptTransfer(payout.id);
		}

		return payout;
	}

	async onOrderShipped(orderId: string) {
		const payout = await this.prisma.vendorPayout.findUnique({
			where: { orderId },
		});
		if(!payout) {
			return null;
		}
		if(payout.status === VendorPayoutStatus.TRANSFERRED) {
			return payout;
		}
		if(payout.trigger !== PayoutTrigger.ON_SHIPMENT) {
			return payout;
		}

		const updated = await this.prisma.vendorPayout.update({
			where: { id: payout.id },
			data: {
				status: VendorPayoutStatus.READY,
				readyAt: payout.readyAt ?? new Date(),
			},
		});

		return this.attemptTransfer(updated.id);
	}

	async retryEligiblePayouts(vendorId?: string) {
		const now = Date.now();
		const candidates = await this.prisma.vendorPayout.findMany({
			where: {
				...(vendorId ? { vendorId } : {}),
				status: {
					in: [
						VendorPayoutStatus.PENDING,
						VendorPayoutStatus.READY,
						VendorPayoutStatus.FAILED,
					],
				},
				attemptCount: { lt: MAX_ATTEMPTS },
			},
			include: {
				order: { select: { status: true, shippedAt: true } },
				vendor: {
					select: {
						stripeConnectAccountId: true,
						stripePayoutsEnabled: true,
					},
				},
			},
			take: 50,
			orderBy: { updatedAt: 'asc' },
		});

		let attempted = 0;
		for(const payout of candidates) {
			if(
				payout.order.status === PlaceEtMarqueOrderStatus.REFUNDED ||
				payout.order.status === PlaceEtMarqueOrderStatus.CANCELLED
			) {
				await this.prisma.vendorPayout.update({
					where: { id: payout.id },
					data: {
						status: VendorPayoutStatus.CANCELLED,
						lastError: 'Order was cancelled or refunded before transfer.',
					},
				});
				continue;
			}

			const triggerMet =
				payout.trigger === PayoutTrigger.ON_PAYMENT ||
				payout.order.status === PlaceEtMarqueOrderStatus.SHIPPED ||
				Boolean(payout.order.shippedAt);

			if(!triggerMet) {
				continue;
			}

			if(
				!payout.vendor.stripeConnectAccountId ||
				!payout.vendor.stripePayoutsEnabled
			) {
				continue;
			}

			const backoffMs = BACKOFF_BASE_MS * Math.min(
				64,
				2 ** Math.max(0, payout.attemptCount - 1),
			);
			if(
				payout.status === VendorPayoutStatus.FAILED &&
				payout.updatedAt.getTime() + backoffMs > now
			) {
				continue;
			}

			if(payout.status === VendorPayoutStatus.PENDING) {
				await this.prisma.vendorPayout.update({
					where: { id: payout.id },
					data: {
						status: VendorPayoutStatus.READY,
						readyAt: payout.readyAt ?? new Date(),
					},
				});
			}

			await this.attemptTransfer(payout.id);
			attempted += 1;
		}

		return { scanned: candidates.length, attempted };
	}

	async attemptTransfer(payoutId: string) {
		const payout = await this.prisma.vendorPayout.findUnique({
			where: { id: payoutId },
			include: {
				vendor: true,
				order: true,
			},
		});
		if(!payout) {
			return null;
		}
		if(
			payout.status === VendorPayoutStatus.TRANSFERRED ||
			payout.status === VendorPayoutStatus.SKIPPED ||
			payout.status === VendorPayoutStatus.CANCELLED ||
			payout.status === VendorPayoutStatus.REVERSED
		) {
			return payout;
		}
		if(
			payout.order.status === PlaceEtMarqueOrderStatus.REFUNDED ||
			payout.order.status === PlaceEtMarqueOrderStatus.CANCELLED
		) {
			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.CANCELLED,
					lastError: 'Order was cancelled or refunded before transfer.',
				},
			});
		}
		if(payout.stripeTransferId) {
			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.TRANSFERRED,
					transferredAt: payout.transferredAt ?? new Date(),
				},
			});
		}
		if(payout.vendorNetCents <= 0) {
			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.SKIPPED,
					readyAt: payout.readyAt ?? new Date(),
				},
			});
		}

		const accountId = payout.vendor.stripeConnectAccountId;
		if(!accountId || !payout.vendor.stripePayoutsEnabled) {
			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.PENDING,
					lastError: 'Vendor Connect account is not ready to receive payouts.',
				},
			});
		}

		if(!this.stripe.enabled) {
			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.FAILED,
					attemptCount: { increment: 1 },
					lastError: 'Stripe is not configured.',
				},
			});
		}

		const transferGroup = payout.checkoutId ?? payout.orderId;

		try {
			const transfer = await this.stripe.createTransfer({
				amountCents: payout.vendorNetCents,
				currency: payout.currency,
				destination: accountId,
				transferGroup,
				orderId: payout.orderId,
				idempotencyKey: `vendor-payout-${payout.id}`,
			});

			await this.prisma.placeEtMarqueOrder.update({
				where: { id: payout.orderId },
				data: { stripeTransferId: transfer.id },
			});

			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.TRANSFERRED,
					stripeTransferId: transfer.id,
					attemptCount: { increment: 1 },
					lastError: null,
					readyAt: payout.readyAt ?? new Date(),
					transferredAt: new Date(),
				},
			});
		}
		catch(error) {
			const message =
				error instanceof Error ? error.message : 'Transfer failed.';
			this.logger.error(
				`Vendor payout transfer failed for ${payout.id}: ${message}`,
				error as Error,
			);
			return this.prisma.vendorPayout.update({
				where: { id: payout.id },
				data: {
					status: VendorPayoutStatus.FAILED,
					attemptCount: { increment: 1 },
					lastError: message.slice(0, 1000),
					readyAt: payout.readyAt ?? new Date(),
				},
			});
		}
	}

	async getVendorPayoutSummary(vendorId: string) {
		const [pending, failed, recent] = await Promise.all([
			this.prisma.vendorPayout.count({
				where: {
					vendorId,
					status: {
						in: [VendorPayoutStatus.PENDING, VendorPayoutStatus.READY],
					},
				},
			}),
			this.prisma.vendorPayout.findFirst({
				where: { vendorId, status: VendorPayoutStatus.FAILED },
				orderBy: { updatedAt: 'desc' },
				select: { lastError: true, updatedAt: true, orderId: true },
			}),
			this.prisma.vendorPayout.findMany({
				where: { vendorId },
				orderBy: { createdAt: 'desc' },
				take: 5,
				select: {
					id: true,
					orderId: true,
					status: true,
					vendorNetCents: true,
					feeCents: true,
					trigger: true,
					lastError: true,
					transferredAt: true,
					createdAt: true,
				},
			}),
		]);

		return {
			pendingCount: pending,
			lastError: failed?.lastError ?? null,
			lastErrorAt: failed?.updatedAt ?? null,
			recent,
		};
	}
}
