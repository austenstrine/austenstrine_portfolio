import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
	private readonly logger = new Logger(StripeService.name);
	private readonly client: Stripe | null;

	constructor() {
		const key = process.env.STRIPE_SECRET_KEY;
		this.client = key
			? new Stripe(key, { apiVersion: '2025-02-24.acacia' })
			: null;
		if(!this.client) {
			this.logger.warn('STRIPE_SECRET_KEY is not set; checkout payments will fail until configured.');
		}
	}

	get enabled() {
		return Boolean(this.client);
	}

	requireClient(): Stripe {
		if(!this.client) {
			throw new Error('Stripe is not configured (missing STRIPE_SECRET_KEY).');
		}
		return this.client;
	}

	async createPaymentIntent(input: {
		amountCents: number;
		currency: string;
		checkoutId: string;
		buyerEmail?: string;
	}) {
		const stripe = this.requireClient();
		return stripe.paymentIntents.create({
			amount: input.amountCents,
			currency: input.currency.toLowerCase(),
			automatic_payment_methods: { enabled: true },
			metadata: { checkoutId: input.checkoutId },
			transfer_group: input.checkoutId,
			receipt_email: input.buyerEmail,
		});
	}

	constructEvent(rawBody: Buffer, signature: string) {
		const stripe = this.requireClient();
		const secret = process.env.STRIPE_WEBHOOK_SECRET;
		if(!secret) {
			throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
		}
		return stripe.webhooks.constructEvent(rawBody, signature, secret);
	}

	async createTransfer(input: {
		amountCents: number;
		currency: string;
		destination: string;
		transferGroup: string;
		orderId: string;
		idempotencyKey?: string;
	}) {
		const stripe = this.requireClient();
		return stripe.transfers.create(
			{
				amount: input.amountCents,
				currency: input.currency.toLowerCase(),
				destination: input.destination,
				transfer_group: input.transferGroup,
				metadata: { orderId: input.orderId },
			},
			input.idempotencyKey
				? { idempotencyKey: input.idempotencyKey }
				: undefined,
		);
	}

	async createExpressAccount(input: {
		email?: string;
		vendorId: string;
	}) {
		const stripe = this.requireClient();
		return stripe.accounts.create({
			type: 'express',
			country: 'US',
			email: input.email,
			capabilities: {
				card_payments: { requested: true },
				transfers: { requested: true },
			},
			business_type: 'individual',
			metadata: { vendorId: input.vendorId },
		});
	}

	async createAccountLink(input: {
		accountId: string;
		refreshUrl: string;
		returnUrl: string;
		type?: 'account_onboarding' | 'account_update';
	}) {
		const stripe = this.requireClient();
		return stripe.accountLinks.create({
			account: input.accountId,
			refresh_url: input.refreshUrl,
			return_url: input.returnUrl,
			type: input.type ?? 'account_onboarding',
		});
	}

	async retrieveAccount(accountId: string) {
		const stripe = this.requireClient();
		return stripe.accounts.retrieve(accountId);
	}
}
