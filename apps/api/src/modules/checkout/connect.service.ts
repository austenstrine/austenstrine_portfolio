import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { VendorMemberRole } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StripeService } from './stripe.service';

type StripeAccountLike = {
	id: string;
	details_submitted?: boolean | null;
	charges_enabled?: boolean | null;
	payouts_enabled?: boolean | null;
};

@Injectable()
export class ConnectService {
	private readonly logger = new Logger(ConnectService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly stripe: StripeService,
	) {}

	async createAccount(userId: string, vendorId: string) {
		await this.assertOwner(userId, vendorId);
		if(!this.stripe.enabled) {
			throw new BadRequestException(
				'Stripe is not configured on the server (STRIPE_SECRET_KEY).',
			);
		}

		const vendor = await this.prisma.vendor.findUnique({
			where: { id: vendorId },
		});
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		if(vendor.stripeConnectAccountId) {
			await this.syncAccountFlags(vendor.stripeConnectAccountId);
			return this.getStatus(userId, vendorId);
		}

		const owner = await this.prisma.vendorMember.findFirst({
			where: { vendorId, role: VendorMemberRole.OWNER },
			include: { user: { select: { email: true } } },
		});

		const account = await this.stripe.createExpressAccount({
			vendorId,
			email: owner?.user.email,
		});

		await this.prisma.vendor.update({
			where: { id: vendorId },
			data: {
				stripeConnectAccountId: account.id,
				stripeDetailsSubmitted: Boolean(account.details_submitted),
				stripeChargesEnabled: Boolean(account.charges_enabled),
				stripePayoutsEnabled: Boolean(account.payouts_enabled),
				stripeOnboardingCompleteAt:
					account.details_submitted && account.payouts_enabled
						? new Date()
						: null,
			},
		});

		return this.getStatus(userId, vendorId);
	}

	async createAccountLink(userId: string, vendorId: string) {
		await this.assertOwner(userId, vendorId);
		if(!this.stripe.enabled) {
			throw new BadRequestException(
				'Stripe is not configured on the server (STRIPE_SECRET_KEY).',
			);
		}

		let vendor = await this.prisma.vendor.findUnique({
			where: { id: vendorId },
		});
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		if(!vendor.stripeConnectAccountId) {
			await this.createAccount(userId, vendorId);
			vendor = await this.prisma.vendor.findUniqueOrThrow({
				where: { id: vendorId },
			});
		}

		const webBase = (
			process.env.STRIPE_CONNECT_RETURN_URL ??
			process.env.WEB_URL ??
			'http://localhost:3000'
		).replace(/\/$/, '');

		const returnUrl = `${webBase}/shop/vendors/${vendorId}?connect=return`;
		const refreshUrl = `${webBase}/shop/vendors/${vendorId}?connect=refresh`;

		const link = await this.stripe.createAccountLink({
			accountId: vendor.stripeConnectAccountId!,
			returnUrl,
			refreshUrl,
			type: vendor.stripeDetailsSubmitted
				? 'account_update'
				: 'account_onboarding',
		});

		return { url: link.url, expiresAt: link.expires_at };
	}

	async getStatus(userId: string, vendorId: string) {
		await this.assertOwner(userId, vendorId);

		const vendor = await this.prisma.vendor.findUnique({
			where: { id: vendorId },
			select: {
				id: true,
				stripeConnectAccountId: true,
				stripeDetailsSubmitted: true,
				stripeChargesEnabled: true,
				stripePayoutsEnabled: true,
				stripeOnboardingCompleteAt: true,
				platformFeeBpsOverride: true,
			},
		});
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		if(vendor.stripeConnectAccountId && this.stripe.enabled) {
			try {
				await this.syncAccountFlags(vendor.stripeConnectAccountId);
			}
			catch(error) {
				this.logger.warn(
					`Could not refresh Connect status for vendor ${vendorId}`,
					error as Error,
				);
			}
		}

		const refreshed = await this.prisma.vendor.findUniqueOrThrow({
			where: { id: vendorId },
			select: {
				id: true,
				stripeConnectAccountId: true,
				stripeDetailsSubmitted: true,
				stripeChargesEnabled: true,
				stripePayoutsEnabled: true,
				stripeOnboardingCompleteAt: true,
				platformFeeBpsOverride: true,
			},
		});

		return {
			vendorId: refreshed.id,
			accountId: refreshed.stripeConnectAccountId,
			detailsSubmitted: refreshed.stripeDetailsSubmitted,
			chargesEnabled: refreshed.stripeChargesEnabled,
			payoutsEnabled: refreshed.stripePayoutsEnabled,
			onboardingCompleteAt: refreshed.stripeOnboardingCompleteAt,
			canReceivePayouts: Boolean(
				refreshed.stripeConnectAccountId && refreshed.stripePayoutsEnabled,
			),
			platformFeeBpsOverride: refreshed.platformFeeBpsOverride,
		};
	}

	async syncAccountFlags(accountId: string) {
		const account = await this.stripe.retrieveAccount(accountId);
		return this.applyAccountUpdate(account);
	}

	async applyAccountUpdate(account: StripeAccountLike) {
		const vendor = await this.prisma.vendor.findFirst({
			where: { stripeConnectAccountId: account.id },
		});
		if(!vendor) {
			this.logger.warn(`account.updated for unknown Connect account ${account.id}`);
			return { vendorId: null, payoutsEnabled: false };
		}

		const detailsSubmitted = Boolean(account.details_submitted);
		const chargesEnabled = Boolean(account.charges_enabled);
		const payoutsEnabled = Boolean(account.payouts_enabled);
		const wasComplete = Boolean(vendor.stripeOnboardingCompleteAt);
		const nowComplete = detailsSubmitted && payoutsEnabled;

		await this.prisma.vendor.update({
			where: { id: vendor.id },
			data: {
				stripeDetailsSubmitted: detailsSubmitted,
				stripeChargesEnabled: chargesEnabled,
				stripePayoutsEnabled: payoutsEnabled,
				stripeOnboardingCompleteAt:
					nowComplete && !wasComplete
						? new Date()
						: nowComplete
							? vendor.stripeOnboardingCompleteAt
							: null,
			},
		});

		return { vendorId: vendor.id, payoutsEnabled };
	}

	private async assertOwner(userId: string, vendorId: string) {
		const membership = await this.prisma.vendorMember.findUnique({
			where: {
				vendorId_userId: { vendorId, userId },
			},
		});
		if(!membership || membership.role !== VendorMemberRole.OWNER) {
			throw new ForbiddenException(
				'Only vendor owners can manage Stripe Connect payouts.',
			);
		}
	}
}
