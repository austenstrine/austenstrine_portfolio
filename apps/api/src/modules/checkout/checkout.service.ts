import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import {
	CheckoutStatus,
	MarketplaceOrderStatus,
	PayoutTrigger,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InventoryService } from '../catalog/inventory/inventory.service';
import { CartService } from './cart.service';
import { ConnectService } from './connect.service';
import { PayoutService } from './payout.service';
import { ShippingService } from './shipping.service';
import { StripeService } from './stripe.service';

const CHECKOUT_TTL_MS = 1000 * 60 * 45;
const TTL_SWEEP_MS = 1000 * 60 * 5;

type AddressInput = {
	name: string;
	line1: string;
	line2?: string;
	city: string;
	region: string;
	postal: string;
	country?: string;
};

type ShipmentRatePick = {
	groupKey: string;
	rateId: string;
	address?: AddressInput;
};

@Injectable()
export class CheckoutService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(CheckoutService.name);
	private ttlTimer: NodeJS.Timeout | null = null;

	constructor(
		private readonly prisma: PrismaService,
		private readonly cart: CartService,
		private readonly shipping: ShippingService,
		private readonly stripe: StripeService,
		private readonly inventory: InventoryService,
		private readonly payouts: PayoutService,
		private readonly connect: ConnectService,
	) {}

	onModuleInit() {
		void this.expireStaleCheckouts().catch((error) => {
			this.logger.error('Initial checkout TTL sweep failed', error as Error);
		});
		this.ttlTimer = setInterval(() => {
			void this.expireStaleCheckouts().catch((error) => {
				this.logger.error('Checkout TTL sweep failed', error as Error);
			});
		}, TTL_SWEEP_MS);
		this.ttlTimer.unref?.();
	}

	onModuleDestroy() {
		if(this.ttlTimer) {
			clearInterval(this.ttlTimer);
			this.ttlTimer = null;
		}
	}

	async preview(buyerId: string) {
		const cart = await this.cart.getCart(buyerId);
		if(cart.lines.length === 0) {
			return {
				groups: [],
				merchandiseCents: 0,
				currency: 'USD',
			};
		}

		const groups = await this.partitionCart(buyerId);
		const merchandiseCents = groups.reduce(
			(sum, group) => sum + group.merchandiseCents,
			0,
		);

		return {
			groups,
			merchandiseCents,
			currency: groups[0]?.currency ?? 'USD',
		};
	}

	async createSession(
		buyerId: string,
		input: {
			address: AddressInput;
			shipments: ShipmentRatePick[];
		},
	) {
		if(!this.stripe.enabled) {
			throw new BadRequestException(
				'Stripe is not configured on the server (STRIPE_SECRET_KEY).',
			);
		}

		const groups = await this.partitionCart(buyerId);
		if(groups.length === 0) {
			throw new BadRequestException('Cart is empty.');
		}

		const pickByKey = new Map(input.shipments.map((row) => [row.groupKey, row]));
		for(const group of groups) {
			const pick = pickByKey.get(group.groupKey);
			if(!pick) {
				throw new BadRequestException(
					`Missing shipping rate selection for ${group.groupKey}.`,
				);
			}
			const rate = group.rates.find((row) => row.id === pick.rateId);
			if(!rate) {
				throw new BadRequestException(
					`Invalid shipping rate for ${group.groupKey}.`,
				);
			}
		}

		const buyer = await this.prisma.user.findUniqueOrThrow({
			where: { id: buyerId },
			select: { email: true },
		});

		const checkout = await this.prisma.checkout.create({
			data: {
				buyerId,
				status: CheckoutStatus.OPEN,
				currency: groups[0].currency,
				expiresAt: new Date(Date.now() + CHECKOUT_TTL_MS),
			},
		});

		let merchandiseCents = 0;
		let shippingCents = 0;

		for(const group of groups) {
			const pick = pickByKey.get(group.groupKey)!;
			const rate = group.rates.find((row) => row.id === pick.rateId)!;
			const address = pick.address ?? input.address;
			merchandiseCents += group.merchandiseCents;
			shippingCents += rate.amountCents;

			await this.prisma.checkoutShipment.create({
				data: {
					checkoutId: checkout.id,
					vendorId: group.vendorId,
					shippingProfileId: group.shippingProfileId,
					selectedRateId: rate.id,
					selectedRateLabel: rate.label,
					shippingCents: rate.amountCents,
					merchandiseCents: group.merchandiseCents,
					shipName: address.name,
					shipLine1: address.line1,
					shipLine2: address.line2,
					shipCity: address.city,
					shipRegion: address.region,
					shipPostal: address.postal,
					shipCountry: address.country ?? 'US',
					lines: {
						create: group.lines.map((line) => ({
							offeringId: line.offeringId,
							quantity: new Decimal(line.quantity),
							unitPriceCents: line.unitPriceCents,
							lineTotalCents: line.lineTotalCents,
							titleSnapshot: line.title,
							skuSnapshot: line.sku,
							offeringKeySnapshot: line.offeringKey,
						})),
					},
				},
			});
		}

		const totalCents = merchandiseCents + shippingCents;
		if(totalCents < 50) {
			throw new BadRequestException('Order total must be at least $0.50.');
		}

		// Hold inventory against hold orders (one MarketplaceOrder per shipment)
		const shipments = await this.prisma.checkoutShipment.findMany({
			where: { checkoutId: checkout.id },
			include: { lines: true },
		});

		for(const shipment of shipments) {
			const profile = await this.prisma.shippingProfile.findUnique({
				where: { id: shipment.shippingProfileId },
				select: { payoutTrigger: true, shipsSeparately: true, code: true },
			});
			const payoutTrigger =
				profile?.payoutTrigger ??
				(profile?.shipsSeparately || profile?.code === 'FREIGHT'
					? PayoutTrigger.ON_SHIPMENT
					: PayoutTrigger.ON_PAYMENT);

			const holdOrder = await this.prisma.marketplaceOrder.create({
				data: {
					orderRef: `hold:${checkout.id}:${shipment.id}`,
					buyerId,
					vendorId: shipment.vendorId,
					checkoutId: checkout.id,
					checkoutShipmentId: shipment.id,
					shippingProfileId: shipment.shippingProfileId,
					status: MarketplaceOrderStatus.HOLD,
					currency: checkout.currency,
					merchandiseCents: shipment.merchandiseCents,
					shippingCents: shipment.shippingCents,
					totalCents: shipment.merchandiseCents + shipment.shippingCents,
					payoutTrigger,
					shippingLabel: shipment.selectedRateLabel,
					shipName: shipment.shipName,
					shipLine1: shipment.shipLine1,
					shipLine2: shipment.shipLine2,
					shipCity: shipment.shipCity,
					shipRegion: shipment.shipRegion,
					shipPostal: shipment.shipPostal,
					shipCountry: shipment.shipCountry,
				},
			});

			for(const line of shipment.lines) {
				const available = await this.prisma.productOffering.findUnique({
					where: { id: line.offeringId },
					select: { availableQty: true },
				});
				if(!available || available.availableQty.lt(line.quantity)) {
					await this.releaseCheckoutHolds(checkout.id);
					await this.prisma.checkout.update({
						where: { id: checkout.id },
						data: { status: CheckoutStatus.FAILED },
					});
					throw new BadRequestException(
						`Insufficient stock for ${line.titleSnapshot}.`,
					);
				}

				const claim = await this.inventory.createClaim({
					orderRef: holdOrder.orderRef,
					orderId: holdOrder.id,
					offeringId: line.offeringId,
					quantity: line.quantity,
					buyerId,
				});

				await this.prisma.orderLine.create({
					data: {
						orderId: holdOrder.id,
						offeringId: line.offeringId,
						quantity: line.quantity,
						unitPriceCents: line.unitPriceCents,
						lineTotalCents: line.lineTotalCents,
						titleSnapshot: line.titleSnapshot,
						skuSnapshot: line.skuSnapshot,
						offeringKeySnapshot: line.offeringKeySnapshot,
						claimId: claim.id,
					},
				});
			}
		}

		const paymentIntent = await this.stripe.createPaymentIntent({
			amountCents: totalCents,
			currency: checkout.currency,
			checkoutId: checkout.id,
			buyerEmail: buyer.email,
		});

		await this.prisma.checkout.update({
			where: { id: checkout.id },
			data: {
				status: CheckoutStatus.AWAITING_PAYMENT,
				stripePaymentIntentId: paymentIntent.id,
				merchandiseCents,
				shippingCents,
				totalCents,
			},
		});

		return {
			checkoutId: checkout.id,
			clientSecret: paymentIntent.client_secret,
			publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
			totalCents,
			currency: checkout.currency,
			expiresAt: checkout.expiresAt,
		};
	}

	async handleStripeEvent(event: { type: string; data: { object: unknown } }) {
		if(event.type === 'account.updated') {
			const account = event.data.object as {
				id?: string;
				details_submitted?: boolean | null;
				charges_enabled?: boolean | null;
				payouts_enabled?: boolean | null;
			};
			if(!account.id) {
				return { ignored: true };
			}
			const synced = await this.connect.applyAccountUpdate({
				id: account.id,
				details_submitted: account.details_submitted,
				charges_enabled: account.charges_enabled,
				payouts_enabled: account.payouts_enabled,
			});
			if(synced.vendorId && synced.payoutsEnabled) {
				await this.payouts.retryEligiblePayouts(synced.vendorId);
			}
			return {
				accountId: account.id,
				vendorId: synced.vendorId,
				status: 'ACCOUNT_UPDATED',
			};
		}

		if(
			event.type !== 'payment_intent.succeeded' &&
			event.type !== 'payment_intent.payment_failed'
		) {
			return { ignored: true };
		}

		const object = event.data.object as {
			id?: string;
			metadata?: Record<string, string> | null;
		};
		const paymentIntentId = object.id;
		const checkoutId =
			object.metadata?.checkoutId ??
			(
				await this.prisma.checkout.findFirst({
					where: { stripePaymentIntentId: paymentIntentId },
					select: { id: true },
				})
			)?.id;

		if(!checkoutId) {
			this.logger.warn(`Stripe event ${event.type} without checkout mapping`);
			return { ignored: true };
		}

		if(event.type === 'payment_intent.payment_failed') {
			await this.failCheckout(checkoutId);
			return { checkoutId, status: 'FAILED' };
		}

		await this.finalizePaidCheckout(checkoutId);
		return { checkoutId, status: 'PAID' };
	}

	async listBuyerOrders(buyerId: string) {
		const orders = await this.prisma.marketplaceOrder.findMany({
			where: {
				buyerId,
				status: {
					in: [
						MarketplaceOrderStatus.PAID,
						MarketplaceOrderStatus.FULFILLING,
						MarketplaceOrderStatus.SHIPPED,
						MarketplaceOrderStatus.REFUNDED,
					],
				},
			},
			include: {
				vendor: true,
				lines: true,
				refunds: {
					orderBy: { createdAt: 'desc' },
					take: 1,
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return orders.map((order) => this.toOrderDto(order));
	}

	async getBuyerOrder(buyerId: string, orderId: string) {
		const order = await this.prisma.marketplaceOrder.findFirst({
			where: { id: orderId, buyerId },
			include: {
				vendor: true,
				lines: true,
				refunds: {
					orderBy: { createdAt: 'desc' },
					take: 3,
				},
			},
		});
		if(!order) {
			throw new NotFoundException('Order not found.');
		}
		return this.toOrderDto(order);
	}

	async listVendorOrders(userId: string, vendorId: string) {
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: { vendorId, userId },
			},
		});
		if(!membership || !['OWNER', 'EDITOR'].includes(membership.role)) {
			throw new BadRequestException('Not allowed to view vendor orders.');
		}

		const orders = await this.prisma.marketplaceOrder.findMany({
			where: {
				vendorId,
				status: {
					in: [
						MarketplaceOrderStatus.PAID,
						MarketplaceOrderStatus.FULFILLING,
						MarketplaceOrderStatus.SHIPPED,
						MarketplaceOrderStatus.REFUNDED,
					],
				},
			},
			include: {
				buyer: { select: { email: true } },
				lines: true,
				refunds: {
					orderBy: { createdAt: 'desc' },
					take: 1,
				},
			},
			orderBy: { createdAt: 'desc' },
		});

		return orders.map((order) => ({
			...this.toOrderDto(order),
			buyerEmail: order.buyer?.email ?? null,
		}));
	}

	async markShipped(userId: string, vendorId: string, orderId: string) {
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: { vendorId, userId },
			},
		});
		if(!membership || !['OWNER', 'EDITOR'].includes(membership.role)) {
			throw new BadRequestException('Not allowed to ship vendor orders.');
		}

		const order = await this.prisma.marketplaceOrder.findFirst({
			where: { id: orderId, vendorId },
		});
		if(!order) {
			throw new NotFoundException('Order not found.');
		}
		if(
			order.status !== MarketplaceOrderStatus.PAID &&
			order.status !== MarketplaceOrderStatus.FULFILLING
		) {
			throw new BadRequestException('Order is not ready to ship.');
		}

		await this.inventory.fulfillClaimsForOrder(order.id);
		const updated = await this.prisma.marketplaceOrder.update({
			where: { id: order.id },
			data: {
				status: MarketplaceOrderStatus.SHIPPED,
				shippedAt: new Date(),
			},
			include: {
				vendor: true,
				lines: true,
			},
		});

		await this.payouts.onOrderShipped(order.id);

		return this.toOrderDto(updated);
	}

	async expireStaleCheckouts() {
		const now = new Date();
		const stale = await this.prisma.checkout.findMany({
			where: {
				status: CheckoutStatus.AWAITING_PAYMENT,
				expiresAt: { lt: now },
			},
			select: { id: true },
		});

		for(const row of stale) {
			await this.failCheckout(row.id, CheckoutStatus.EXPIRED);
		}

		return { expired: stale.length };
	}

	private async finalizePaidCheckout(checkoutId: string) {
		const checkout = await this.prisma.checkout.findUnique({
			where: { id: checkoutId },
			include: {
				orders: true,
			},
		});

		if(!checkout) {
			return;
		}
		if(checkout.status === CheckoutStatus.PAID) {
			return;
		}

		await this.prisma.checkout.update({
			where: { id: checkoutId },
			data: { status: CheckoutStatus.PAID },
		});

		const orders = await this.prisma.marketplaceOrder.findMany({
			where: { checkoutId },
		});

		for(const order of orders) {
			await this.prisma.marketplaceOrder.update({
				where: { id: order.id },
				data: {
					status: MarketplaceOrderStatus.PAID,
					orderRef: order.orderRef.startsWith('hold:')
						? `ord_${randomUUID().slice(0, 12)}`
						: order.orderRef,
				},
			});

			await this.payouts.createPayoutForPaidOrder(order.id);
		}

		await this.cart.clearCart(checkout.buyerId);
	}

	private async failCheckout(
		checkoutId: string,
		status: CheckoutStatus = CheckoutStatus.FAILED,
	) {
		const checkout = await this.prisma.checkout.findUnique({
			where: { id: checkoutId },
		});
		if(!checkout) {
			return;
		}
		if(
			checkout.status === CheckoutStatus.PAID ||
			checkout.status === CheckoutStatus.EXPIRED ||
			checkout.status === CheckoutStatus.FAILED
		) {
			return;
		}

		await this.releaseCheckoutHolds(checkoutId);
		await this.prisma.checkout.update({
			where: { id: checkoutId },
			data: { status },
		});
		await this.prisma.marketplaceOrder.updateMany({
			where: { checkoutId, status: MarketplaceOrderStatus.HOLD },
			data: { status: MarketplaceOrderStatus.CANCELLED },
		});
	}

	private async releaseCheckoutHolds(checkoutId: string) {
		const orders = await this.prisma.marketplaceOrder.findMany({
			where: { checkoutId },
			select: { id: true },
		});
		for(const order of orders) {
			await this.inventory.releaseClaimsForOrder(order.id);
		}
	}

	private async partitionCart(buyerId: string) {
		const cart = await this.cart.getCart(buyerId);
		const vendorIds = [...new Set(cart.lines.map((line) => line.vendor.id))];
		for(const vendorId of vendorIds) {
			await this.shipping.ensureVendorDefaults(vendorId);
		}

		type Acc = {
			groupKey: string;
			vendorId: string;
			vendorName: string;
			shippingProfileId: string;
			shippingProfileCode: string;
			shippingProfileName: string;
			shipsSeparately: boolean;
			currency: string;
			merchandiseCents: number;
			lines: Array<{
				offeringId: string;
				quantity: string;
				unitPriceCents: number;
				lineTotalCents: number;
				title: string;
				sku: string;
				offeringKey: string;
			}>;
			rates: Array<{
				id: string;
				label: string;
				amountCents: number;
			}>;
		};

		const groups = new Map<string, Acc>();

		for(const line of cart.lines) {
			if(new Decimal(line.availableQty).lt(line.quantity)) {
				throw new BadRequestException(
					`Insufficient stock for ${line.title}. Available ${line.availableQty}.`,
				);
			}

			let profileId = line.shippingProfileId;
			if(!profileId) {
				const defaults = await this.shipping.ensureVendorDefaults(line.vendor.id);
				profileId = defaults.standard.id;
			}

			const profile = await this.prisma.shippingProfile.findUniqueOrThrow({
				where: { id: profileId },
				include: { rates: { orderBy: { amountCents: 'asc' } } },
			});

			const groupKey = `${line.vendor.id}:${profile.id}`;
			let group = groups.get(groupKey);
			if(!group) {
				group = {
					groupKey,
					vendorId: line.vendor.id,
					vendorName: line.vendor.name,
					shippingProfileId: profile.id,
					shippingProfileCode: profile.code,
					shippingProfileName: profile.name,
					shipsSeparately: profile.shipsSeparately,
					currency: line.currency,
					merchandiseCents: 0,
					lines: [],
					rates: profile.rates
						.filter((rate) => {
							const minOk =
								rate.minSubtotalCents == null ||
								true; // filtered after subtotal known
							return minOk;
						})
						.map((rate) => ({
							id: rate.id,
							label: rate.label,
							amountCents: rate.amountCents,
							minSubtotalCents: rate.minSubtotalCents,
							maxSubtotalCents: rate.maxSubtotalCents,
						})) as Acc['rates'] &
						Array<{
							minSubtotalCents?: number | null;
							maxSubtotalCents?: number | null;
						}>,
				};
				groups.set(groupKey, group);
			}

			group.merchandiseCents += line.lineTotalCents;
			group.lines.push({
				offeringId: line.offeringId,
				quantity: line.quantity,
				unitPriceCents: line.unitPriceCents,
				lineTotalCents: line.lineTotalCents,
				title: line.title,
				sku: line.sku,
				offeringKey: line.offeringKey,
			});
		}

		return [...groups.values()].map((group) => {
			const rates = (
				group.rates as Array<{
					id: string;
					label: string;
					amountCents: number;
					minSubtotalCents?: number | null;
					maxSubtotalCents?: number | null;
				}>
			).filter((rate) => {
				if(
					rate.minSubtotalCents != null &&
					group.merchandiseCents < rate.minSubtotalCents
				) {
					return false;
				}
				if(
					rate.maxSubtotalCents != null &&
					group.merchandiseCents > rate.maxSubtotalCents
				) {
					return false;
				}
				return true;
			});

			if(rates.length === 0) {
				throw new BadRequestException(
					`No shipping rates available for ${group.vendorName} / ${group.shippingProfileCode}.`,
				);
			}

			return {
				...group,
				rates: rates.map((rate) => ({
					id: rate.id,
					label: rate.label,
					amountCents: rate.amountCents,
				})),
			};
		});
	}

	private toOrderDto(order: {
		id: string;
		orderRef: string;
		status: MarketplaceOrderStatus;
		currency: string;
		merchandiseCents: number;
		shippingCents: number;
		totalCents: number;
		feeCents?: number;
		vendorNetCents?: number;
		shippingLabel: string | null;
		shipName: string | null;
		shipLine1: string | null;
		shipLine2: string | null;
		shipCity: string | null;
		shipRegion: string | null;
		shipPostal: string | null;
		shipCountry: string | null;
		shippedAt: Date | null;
		refundedAt?: Date | null;
		cancelledAt?: Date | null;
		createdAt: Date;
		vendor?: { id: string; slug: string; name: string } | null;
		refunds?: Array<{
			id: string;
			reason: string;
			status: string;
			buyerRefundCents: number;
			note: string | null;
			succeededAt: Date | null;
			createdAt: Date;
		}>;
		lines: Array<{
			id: string;
			offeringId: string;
			quantity: Decimal;
			unitPriceCents: number;
			lineTotalCents: number;
			titleSnapshot: string;
			skuSnapshot: string;
			offeringKeySnapshot: string;
		}>;
	}) {
		const canBuyerCancel =
			order.status === MarketplaceOrderStatus.PAID ||
			order.status === MarketplaceOrderStatus.FULFILLING;
		const canVendorRefund =
			order.status === MarketplaceOrderStatus.PAID ||
			order.status === MarketplaceOrderStatus.FULFILLING ||
			order.status === MarketplaceOrderStatus.SHIPPED;

		return {
			id: order.id,
			orderRef: order.orderRef,
			status: order.status,
			currency: order.currency,
			merchandiseCents: order.merchandiseCents,
			shippingCents: order.shippingCents,
			totalCents: order.totalCents,
			feeCents: order.feeCents ?? 0,
			vendorNetCents: order.vendorNetCents ?? 0,
			shippingLabel: order.shippingLabel,
			shipTo: {
				name: order.shipName,
				line1: order.shipLine1,
				line2: order.shipLine2,
				city: order.shipCity,
				region: order.shipRegion,
				postal: order.shipPostal,
				country: order.shipCountry,
			},
			shippedAt: order.shippedAt,
			refundedAt: order.refundedAt ?? null,
			cancelledAt: order.cancelledAt ?? null,
			createdAt: order.createdAt,
			canBuyerCancel,
			canVendorRefund,
			vendor: order.vendor
				? {
						id: order.vendor.id,
						slug: order.vendor.slug,
						name: order.vendor.name,
					}
				: null,
			refunds: (order.refunds ?? []).map((row) => ({
				id: row.id,
				reason: row.reason,
				status: row.status,
				buyerRefundCents: row.buyerRefundCents,
				note: row.note,
				succeededAt: row.succeededAt,
				createdAt: row.createdAt,
			})),
			lines: order.lines.map((line) => ({
				id: line.id,
				offeringId: line.offeringId,
				quantity: line.quantity.toString(),
				unitPriceCents: line.unitPriceCents,
				lineTotalCents: line.lineTotalCents,
				title: line.titleSnapshot,
				sku: line.skuSnapshot,
				offeringKey: line.offeringKeySnapshot,
			})),
		};
	}
}
