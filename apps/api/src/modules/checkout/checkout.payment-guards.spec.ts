import {
	CheckoutStatus,
	InventoryClaimStatus,
	PlaceEtMarqueOrderStatus,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { BadRequestException } from '@nestjs/common';
import { CheckoutService } from './checkout.service';

type DeepPartial<T> = {
	[K in keyof T]?: T[K] extends (...args: never[]) => unknown
		? T[K]
		: DeepPartial<T[K]>;
};

function buildService(overrides: {
	prisma?: DeepPartial<CheckoutService['prisma']>;
	cart?: DeepPartial<CheckoutService['cart']>;
	shipping?: DeepPartial<CheckoutService['shipping']>;
	stripe?: DeepPartial<CheckoutService['stripe']>;
	inventory?: DeepPartial<CheckoutService['inventory']>;
	payouts?: DeepPartial<CheckoutService['payouts']>;
	connect?: DeepPartial<CheckoutService['connect']>;
}) {
	const prisma = {
		checkout: {
			findUnique: jest.fn(),
			findMany: jest.fn().mockResolvedValue([]),
			create: jest.fn(),
			update: jest.fn(),
		},
		checkoutShipment: {
			findMany: jest.fn().mockResolvedValue([]),
			create: jest.fn(),
		},
		placeEtMarqueOrder: {
			findUnique: jest.fn().mockResolvedValue(null),
			findMany: jest.fn().mockResolvedValue([]),
			create: jest.fn(),
			update: jest.fn(),
			updateMany: jest.fn(),
		},
		productOffering: {
			findUnique: jest.fn(),
		},
		orderLine: {
			create: jest.fn(),
		},
		shippingProfile: {
			findUnique: jest.fn(),
		},
		user: {
			findUniqueOrThrow: jest.fn(),
		},
		...overrides.prisma,
	};

	const cart = {
		getCart: jest.fn(),
		clearCart: jest.fn(),
		...overrides.cart,
	};
	const shipping = {
		ensureVendorDefaults: jest.fn(),
		...overrides.shipping,
	};
	const stripe = {
		enabled: true,
		createPaymentIntent: jest.fn(),
		cancelPaymentIntent: jest.fn().mockResolvedValue(null),
		...overrides.stripe,
	};
	const inventory = {
		createClaim: jest.fn(),
		releaseClaimsForOrder: jest.fn().mockResolvedValue(undefined),
		...overrides.inventory,
	};
	const payouts = {
		createPayoutForPaidOrder: jest.fn().mockResolvedValue(undefined),
		...overrides.payouts,
	};
	const connect = {
		...overrides.connect,
	};

	const service = new CheckoutService(
		prisma as never,
		cart as never,
		shipping as never,
		stripe as never,
		inventory as never,
		payouts as never,
		connect as never,
	);

	return { service, prisma, cart, shipping, stripe, inventory, payouts };
}

describe('checkout payment guards (PEM-196)', () => {
	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('finalizePaidCheckout', () => {
		it.each([
			CheckoutStatus.FAILED,
			CheckoutStatus.EXPIRED,
			CheckoutStatus.OPEN,
		])('no-ops when checkout is %s', async (status) => {
			const { service, prisma, cart, payouts } = buildService({
				prisma: {
					checkout: {
						findUnique: jest.fn().mockResolvedValue({
							id: 'co_1',
							buyerId: 'buyer_1',
							status,
							orders: [],
						}),
						update: jest.fn(),
					},
					placeEtMarqueOrder: {
						findMany: jest.fn(),
						update: jest.fn(),
					},
				},
			});

			await (service as unknown as {
				finalizePaidCheckout: (id: string) => Promise<void>;
			}).finalizePaidCheckout('co_1');

			expect(prisma.checkout.update).not.toHaveBeenCalled();
			expect(prisma.placeEtMarqueOrder.findMany).not.toHaveBeenCalled();
			expect(payouts.createPayoutForPaidOrder).not.toHaveBeenCalled();
			expect(cart.clearCart).not.toHaveBeenCalled();
		});

		it('marks only HOLD orders PAID when awaiting payment', async () => {
			const orderUpdate = jest.fn();
			const { service, prisma, cart, payouts } = buildService({
				prisma: {
					checkout: {
						findUnique: jest.fn().mockResolvedValue({
							id: 'co_1',
							buyerId: 'buyer_1',
							status: CheckoutStatus.AWAITING_PAYMENT,
							orders: [],
						}),
						update: jest.fn(),
					},
					placeEtMarqueOrder: {
						findMany: jest.fn().mockResolvedValue([
							{ id: 'ord_hold' },
						]),
						update: orderUpdate,
					},
				},
			});

			await (service as unknown as {
				finalizePaidCheckout: (id: string) => Promise<void>;
			}).finalizePaidCheckout('co_1');

			expect(prisma.checkout.update).toHaveBeenCalledWith({
				where: { id: 'co_1' },
				data: { status: CheckoutStatus.PAID },
			});
			expect(prisma.placeEtMarqueOrder.findMany).toHaveBeenCalledWith({
				where: {
					checkoutId: 'co_1',
					status: PlaceEtMarqueOrderStatus.HOLD,
				},
			});
			expect(orderUpdate).toHaveBeenCalledWith({
				where: { id: 'ord_hold' },
				data: { status: PlaceEtMarqueOrderStatus.PAID },
			});
			expect(payouts.createPayoutForPaidOrder).toHaveBeenCalledWith('ord_hold');
			expect(cart.clearCart).toHaveBeenCalledWith('buyer_1');
		});
	});

	describe('expireStaleCheckouts', () => {
		it('expires stale OPEN checkouts that still have PENDING claims', async () => {
			const findMany = jest
				.fn()
				.mockResolvedValueOnce([{ id: 'co_await' }])
				.mockResolvedValueOnce([{ id: 'co_open' }]);
			const cancelPaymentIntent = jest.fn().mockResolvedValue(null);
			const updateMany = jest.fn();
			const checkoutUpdate = jest.fn();
			const releaseClaimsForOrder = jest.fn().mockResolvedValue(undefined);

			const { service, prisma, stripe, inventory } = buildService({
				prisma: {
					checkout: {
						findMany,
						findUnique: jest
							.fn()
							.mockImplementation(({ where }: { where: { id: string } }) =>
								Promise.resolve({
									id: where.id,
									status:
										where.id === 'co_await'
											? CheckoutStatus.AWAITING_PAYMENT
											: CheckoutStatus.OPEN,
									stripePaymentIntentId:
										where.id === 'co_await'
											? 'pi_await'
											: null,
								}),
							),
						update: checkoutUpdate,
					},
					placeEtMarqueOrder: {
						findMany: jest.fn().mockResolvedValue([{ id: 'ord_1' }]),
						updateMany,
					},
				},
				stripe: { cancelPaymentIntent },
				inventory: { releaseClaimsForOrder },
			});

			const result = await service.expireStaleCheckouts();

			expect(result).toEqual({ expired: 2 });
			expect(findMany).toHaveBeenNthCalledWith(
				1,
				expect.objectContaining({
					where: expect.objectContaining({
						status: CheckoutStatus.AWAITING_PAYMENT,
					}),
				}),
			);
			expect(findMany).toHaveBeenNthCalledWith(
				2,
				expect.objectContaining({
					where: expect.objectContaining({
						status: CheckoutStatus.OPEN,
						orders: {
							some: {
								claims: {
									some: {
										status: InventoryClaimStatus.PENDING,
									},
								},
							},
						},
					}),
				}),
			);
			expect(checkoutUpdate).toHaveBeenCalledWith({
				where: { id: 'co_open' },
				data: { status: CheckoutStatus.EXPIRED },
			});
			expect(updateMany).toHaveBeenCalledWith({
				where: {
					checkoutId: 'co_open',
					status: PlaceEtMarqueOrderStatus.HOLD,
				},
				data: { status: PlaceEtMarqueOrderStatus.CANCELLED },
			});
			expect(inventory.releaseClaimsForOrder).toHaveBeenCalled();
			expect(stripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_await');
		});
	});

	describe('failCheckout PaymentIntent cancel', () => {
		it('cancels Stripe PaymentIntent when present on fail', async () => {
			const cancelPaymentIntent = jest.fn().mockResolvedValue({ id: 'pi_1' });
			const { service, stripe, prisma } = buildService({
				prisma: {
					checkout: {
						findUnique: jest.fn().mockResolvedValue({
							id: 'co_1',
							status: CheckoutStatus.AWAITING_PAYMENT,
							stripePaymentIntentId: 'pi_1',
						}),
						update: jest.fn(),
					},
					placeEtMarqueOrder: {
						findMany: jest.fn().mockResolvedValue([]),
						updateMany: jest.fn(),
					},
				},
				stripe: { cancelPaymentIntent },
			});

			await (service as unknown as {
				failCheckout: (
					id: string,
					status?: CheckoutStatus,
				) => Promise<void>;
			}).failCheckout('co_1');

			expect(stripe.cancelPaymentIntent).toHaveBeenCalledWith('pi_1');
			expect(prisma.checkout.update).toHaveBeenCalledWith({
				where: { id: 'co_1' },
				data: { status: CheckoutStatus.FAILED },
			});
		});
	});

	describe('createSession stock-fail', () => {
		it('CANCELLED HOLD orders via failCheckout on mid-create stock fail', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			process.env.CHECKOUT_DEV_BYPASS = '1';

			const orderUpdateMany = jest.fn();
			const checkoutUpdate = jest.fn();
			const releaseClaimsForOrder = jest.fn().mockResolvedValue(undefined);

			const holdOrder = {
				id: 'ord_hold',
				orderRef: 'Jane · 1 · Portland, OR · 12:00 PM PT',
			};

			const { service, prisma, inventory, cart, shipping } = buildService({
				stripe: { enabled: false },
				cart: {
					getCart: jest.fn().mockResolvedValue({
						lines: [
							{
								offeringId: 'off_1',
								quantity: '1',
								unitPriceCents: 1000,
								lineTotalCents: 1000,
								title: 'Widget',
								sku: 'W-1',
								offeringKey: 'pack',
								availableQty: '1',
								currency: 'USD',
								shippingProfileId: 'sp_1',
								vendor: { id: 'vend_1', name: 'Acme' },
							},
						],
					}),
				},
				shipping: {
					ensureVendorDefaults: jest.fn().mockResolvedValue({
						standard: { id: 'sp_1' },
					}),
				},
				prisma: {
					user: {
						findUniqueOrThrow: jest.fn().mockResolvedValue({
							email: 'buyer@example.com',
						}),
					},
					checkout: {
						create: jest.fn().mockResolvedValue({
							id: 'co_1',
							currency: 'USD',
							expiresAt: new Date(Date.now() + 60_000),
						}),
						update: checkoutUpdate,
						findUnique: jest.fn().mockResolvedValue({
							id: 'co_1',
							status: CheckoutStatus.OPEN,
							stripePaymentIntentId: null,
						}),
					},
					checkoutShipment: {
						create: jest.fn(),
						findMany: jest.fn().mockResolvedValue([
							{
								id: 'ship_1',
								vendorId: 'vend_1',
								shippingProfileId: 'sp_1',
								selectedRateLabel: 'Ground',
								merchandiseCents: 1000,
								shippingCents: 999,
								shipName: 'Jane',
								shipLine1: '1 Main',
								shipLine2: null,
								shipCity: 'Portland',
								shipRegion: 'OR',
								shipPostal: '97201',
								shipCountry: 'US',
								lines: [
									{
										offeringId: 'off_1',
										quantity: new Decimal(1),
										unitPriceCents: 1000,
										lineTotalCents: 1000,
										titleSnapshot: 'Widget',
										skuSnapshot: 'W-1',
										offeringKeySnapshot: 'pack',
									},
								],
							},
						]),
					},
					shippingProfile: {
						findUnique: jest.fn().mockResolvedValue({
							payoutTrigger: 'ON_PAYMENT',
							shipsSeparately: false,
							code: 'STANDARD',
						}),
						findUniqueOrThrow: jest.fn().mockResolvedValue({
							id: 'sp_1',
							code: 'STANDARD',
							name: 'Standard',
							shipsSeparately: false,
							rates: [
								{
									id: 'rate_1',
									label: 'Ground',
									amountCents: 999,
									minSubtotalCents: null,
									maxSubtotalCents: null,
								},
							],
						}),
					},
					placeEtMarqueOrder: {
						findUnique: jest.fn().mockResolvedValue(null),
						create: jest.fn().mockResolvedValue(holdOrder),
						findMany: jest.fn().mockResolvedValue([{ id: 'ord_hold' }]),
						updateMany: orderUpdateMany,
					},
					productOffering: {
						findUnique: jest.fn().mockResolvedValue({
							availableQty: new Decimal(0),
						}),
					},
				},
				inventory: { releaseClaimsForOrder },
			});

			await expect(
				service.createSession('buyer_1', {
					address: {
						name: 'Jane',
						line1: '1 Main',
						city: 'Portland',
						region: 'OR',
						postal: '97201',
						country: 'US',
					},
					shipments: [{ groupKey: 'vend_1:sp_1', rateId: 'rate_1' }],
				}),
			).rejects.toBeInstanceOf(BadRequestException);

			expect(orderUpdateMany).toHaveBeenCalledWith({
				where: {
					checkoutId: 'co_1',
					status: PlaceEtMarqueOrderStatus.HOLD,
				},
				data: { status: PlaceEtMarqueOrderStatus.CANCELLED },
			});
			expect(checkoutUpdate).toHaveBeenCalledWith({
				where: { id: 'co_1' },
				data: { status: CheckoutStatus.FAILED },
			});
			expect(releaseClaimsForOrder).toHaveBeenCalledWith('ord_hold');
			expect(inventory.createClaim).not.toHaveBeenCalled();
			expect(cart.getCart).toHaveBeenCalled();
			expect(shipping.ensureVendorDefaults).toHaveBeenCalled();

			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
		});
	});

	describe('createSession bypass demo payment', () => {
		it('returns demoPayment and stays AWAITING_PAYMENT without finalize', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			const prevNodeEnv = process.env.NODE_ENV;
			process.env.CHECKOUT_DEV_BYPASS = '1';
			process.env.NODE_ENV = 'test';

			const checkoutUpdate = jest.fn();
			const orderUpdate = jest.fn();
			const createClaim = jest.fn().mockResolvedValue({ id: 'claim_1' });

			const { service } = buildService({
				stripe: { enabled: false },
				cart: {
					getCart: jest.fn().mockResolvedValue({
						lines: [
							{
								offeringId: 'off_1',
								quantity: '1',
								unitPriceCents: 1000,
								lineTotalCents: 1000,
								title: 'Widget',
								sku: 'W-1',
								offeringKey: 'pack',
								availableQty: '2',
								currency: 'USD',
								shippingProfileId: 'sp_1',
								vendor: { id: 'vend_1', name: 'Acme' },
							},
						],
					}),
				},
				shipping: {
					ensureVendorDefaults: jest.fn().mockResolvedValue({
						standard: { id: 'sp_1' },
					}),
				},
				inventory: { createClaim },
				prisma: {
					user: {
						findUniqueOrThrow: jest.fn().mockResolvedValue({
							email: 'buyer@example.com',
						}),
					},
					checkout: {
						create: jest.fn().mockResolvedValue({
							id: 'co_demo',
							currency: 'USD',
							expiresAt: new Date(Date.now() + 60_000),
						}),
						update: checkoutUpdate,
					},
					checkoutShipment: {
						create: jest.fn(),
						findMany: jest.fn().mockResolvedValue([
							{
								id: 'ship_1',
								vendorId: 'vend_1',
								shippingProfileId: 'sp_1',
								selectedRateLabel: 'Ground',
								merchandiseCents: 1000,
								shippingCents: 999,
								shipName: 'Jane',
								shipLine1: '1 Main',
								shipLine2: null,
								shipCity: 'Portland',
								shipRegion: 'OR',
								shipPostal: '97201',
								shipCountry: 'US',
								lines: [
									{
										offeringId: 'off_1',
										quantity: new Decimal(1),
										unitPriceCents: 1000,
										lineTotalCents: 1000,
										titleSnapshot: 'Widget',
										skuSnapshot: 'W-1',
										offeringKeySnapshot: 'pack',
									},
								],
							},
						]),
					},
					shippingProfile: {
						findUnique: jest.fn().mockResolvedValue({
							payoutTrigger: 'ON_PAYMENT',
							shipsSeparately: false,
							code: 'STANDARD',
						}),
						findUniqueOrThrow: jest.fn().mockResolvedValue({
							id: 'sp_1',
							code: 'STANDARD',
							name: 'Standard',
							shipsSeparately: false,
							rates: [
								{
									id: 'rate_1',
									label: 'Ground',
									amountCents: 999,
									minSubtotalCents: null,
									maxSubtotalCents: null,
								},
							],
						}),
					},
					placeEtMarqueOrder: {
						findUnique: jest.fn().mockResolvedValue(null),
						create: jest.fn().mockResolvedValue({
							id: 'ord_hold',
							orderRef: 'Jane · 1 · Portland, OR · 12:00 PM PT',
						}),
						update: orderUpdate,
					},
					productOffering: {
						findUnique: jest.fn().mockResolvedValue({
							availableQty: new Decimal(2),
						}),
					},
					orderLine: {
						create: jest.fn(),
					},
				},
			});

			const finalizeSpy = jest.spyOn(
				service as unknown as {
					finalizePaidCheckout: (id: string) => Promise<void>;
				},
				'finalizePaidCheckout',
			);

			const result = await service.createSession('buyer_1', {
				address: {
					name: 'Jane',
					line1: '1 Main',
					city: 'Portland',
					region: 'OR',
					postal: '97201',
					country: 'US',
				},
				shipments: [{ groupKey: 'vend_1:sp_1', rateId: 'rate_1' }],
			});

			expect(result).toMatchObject({
				checkoutId: 'co_demo',
				clientSecret: null,
				demoPayment: true,
				totalCents: 1999,
			});
			expect(checkoutUpdate).toHaveBeenCalledWith({
				where: { id: 'co_demo' },
				data: {
					status: CheckoutStatus.AWAITING_PAYMENT,
					merchandiseCents: 1000,
					shippingCents: 999,
					totalCents: 1999,
				},
			});
			expect(finalizeSpy).not.toHaveBeenCalled();
			expect(orderUpdate).not.toHaveBeenCalled();
			expect(createClaim).toHaveBeenCalled();

			finalizeSpy.mockRestore();
			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
			if(prevNodeEnv === undefined) {
				delete process.env.NODE_ENV;
			}
			else {
				process.env.NODE_ENV = prevNodeEnv;
			}
		});

		it('refuses bypass when NODE_ENV is production', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			const prevNodeEnv = process.env.NODE_ENV;
			process.env.CHECKOUT_DEV_BYPASS = '1';
			process.env.NODE_ENV = 'production';

			const { service } = buildService({
				stripe: { enabled: false },
			});

			await expect(
				service.createSession('buyer_1', {
					address: {
						name: 'Jane',
						line1: '1 Main',
						city: 'Portland',
						region: 'OR',
						postal: '97201',
					},
					shipments: [{ groupKey: 'vend_1:sp_1', rateId: 'rate_1' }],
				}),
			).rejects.toBeInstanceOf(BadRequestException);

			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
			if(prevNodeEnv === undefined) {
				delete process.env.NODE_ENV;
			}
			else {
				process.env.NODE_ENV = prevNodeEnv;
			}
		});
	});

	describe('confirmDemoPayment', () => {
		it('finalizes AWAITING_PAYMENT checkout when bypass is on', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			process.env.CHECKOUT_DEV_BYPASS = '1';

			const checkoutUpdate = jest.fn();
			const orderUpdate = jest.fn();
			const clearCart = jest.fn().mockResolvedValue(undefined);
			const createPayoutForPaidOrder = jest.fn().mockResolvedValue(undefined);

			const { service } = buildService({
				stripe: { enabled: false },
				cart: { clearCart },
				payouts: { createPayoutForPaidOrder },
				prisma: {
					checkout: {
						findUnique: jest
							.fn()
							.mockResolvedValueOnce({
								id: 'co_demo',
								buyerId: 'buyer_1',
								status: CheckoutStatus.AWAITING_PAYMENT,
								stripePaymentIntentId: null,
								totalCents: 1999,
								currency: 'USD',
							})
							.mockResolvedValueOnce({
								id: 'co_demo',
								status: CheckoutStatus.AWAITING_PAYMENT,
								buyerId: 'buyer_1',
								orders: [],
							}),
						findUniqueOrThrow: jest.fn().mockResolvedValue({
							id: 'co_demo',
							status: CheckoutStatus.PAID,
							totalCents: 1999,
							currency: 'USD',
						}),
						update: checkoutUpdate,
					},
					placeEtMarqueOrder: {
						findMany: jest.fn().mockResolvedValue([
							{ id: 'ord_1' },
						]),
						update: orderUpdate,
					},
				},
			});

			const result = await service.confirmDemoPayment('buyer_1', 'co_demo');

			expect(result).toEqual({
				checkoutId: 'co_demo',
				status: CheckoutStatus.PAID,
				totalCents: 1999,
				currency: 'USD',
			});
			expect(checkoutUpdate).toHaveBeenCalledWith({
				where: { id: 'co_demo' },
				data: { status: CheckoutStatus.PAID },
			});
			expect(orderUpdate).toHaveBeenCalledWith({
				where: { id: 'ord_1' },
				data: { status: PlaceEtMarqueOrderStatus.PAID },
			});
			expect(createPayoutForPaidOrder).toHaveBeenCalledWith('ord_1');
			expect(clearCart).toHaveBeenCalledWith('buyer_1');

			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
		});

		it('rejects when Stripe is enabled', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			const prevNodeEnv = process.env.NODE_ENV;
			process.env.CHECKOUT_DEV_BYPASS = '1';
			process.env.NODE_ENV = 'test';

			const { service } = buildService({
				stripe: { enabled: true },
			});

			await expect(
				service.confirmDemoPayment('buyer_1', 'co_demo'),
			).rejects.toBeInstanceOf(BadRequestException);

			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
			if(prevNodeEnv === undefined) {
				delete process.env.NODE_ENV;
			}
			else {
				process.env.NODE_ENV = prevNodeEnv;
			}
		});

		it('rejects when bypass is unset', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			const prevNodeEnv = process.env.NODE_ENV;
			delete process.env.CHECKOUT_DEV_BYPASS;
			process.env.NODE_ENV = 'test';

			const { service } = buildService({
				stripe: { enabled: false },
			});

			await expect(
				service.confirmDemoPayment('buyer_1', 'co_demo'),
			).rejects.toBeInstanceOf(BadRequestException);

			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
			if(prevNodeEnv === undefined) {
				delete process.env.NODE_ENV;
			}
			else {
				process.env.NODE_ENV = prevNodeEnv;
			}
		});

		it('rejects when NODE_ENV is production', async () => {
			const prevBypass = process.env.CHECKOUT_DEV_BYPASS;
			const prevNodeEnv = process.env.NODE_ENV;
			process.env.CHECKOUT_DEV_BYPASS = '1';
			process.env.NODE_ENV = 'production';

			const { service } = buildService({
				stripe: { enabled: false },
			});

			await expect(
				service.confirmDemoPayment('buyer_1', 'co_demo'),
			).rejects.toBeInstanceOf(BadRequestException);

			if(prevBypass === undefined) {
				delete process.env.CHECKOUT_DEV_BYPASS;
			}
			else {
				process.env.CHECKOUT_DEV_BYPASS = prevBypass;
			}
			if(prevNodeEnv === undefined) {
				delete process.env.NODE_ENV;
			}
			else {
				process.env.NODE_ENV = prevNodeEnv;
			}
		});
	});
});
