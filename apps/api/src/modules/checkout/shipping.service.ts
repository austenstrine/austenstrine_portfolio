import { Injectable, NotFoundException } from '@nestjs/common';
import { PayoutTrigger } from '@prisma/client';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { VendorAccessService } from '../catalog/vendor-access.service';

@Injectable()
export class ShippingService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
	) {}

	async ensureVendorDefaults(vendorId: string) {
		let standard = await this.prisma.shippingProfile.findUnique({
			where: {
				vendorId_code: { vendorId, code: 'STANDARD' },
			},
			include: { rates: true },
		});

		if(!standard) {
			standard = await this.prisma.shippingProfile.create({
				data: {
					vendorId,
					code: 'STANDARD',
					name: 'Standard',
					shipsSeparately: false,
					payoutTrigger: PayoutTrigger.ON_PAYMENT,
					rates: {
						create: {
							label: 'Ground',
							amountCents: 999,
						},
					},
				},
				include: { rates: true },
			});
		}
		else if(standard.rates.length === 0) {
			await this.prisma.shippingRate.create({
				data: {
					profileId: standard.id,
					label: 'Ground',
					amountCents: 999,
				},
			});
			standard = await this.prisma.shippingProfile.findUniqueOrThrow({
				where: { id: standard.id },
				include: { rates: true },
			});
		}

		let freight = await this.prisma.shippingProfile.findUnique({
			where: {
				vendorId_code: { vendorId, code: 'FREIGHT' },
			},
			include: { rates: true },
		});

		if(!freight) {
			freight = await this.prisma.shippingProfile.create({
				data: {
					vendorId,
					code: 'FREIGHT',
					name: 'Freight',
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
					rates: {
						create: {
							label: 'Freight pallet',
							amountCents: 14900,
						},
					},
				},
				include: { rates: true },
			});
		}
		else if(
			freight.payoutTrigger !== PayoutTrigger.ON_SHIPMENT ||
			!freight.shipsSeparately
		) {
			freight = await this.prisma.shippingProfile.update({
				where: { id: freight.id },
				data: {
					shipsSeparately: true,
					payoutTrigger: PayoutTrigger.ON_SHIPMENT,
				},
				include: { rates: true },
			});
		}

		return { standard, freight };
	}

	async listProfiles(userId: string, vendorId: string) {
		await this.vendorAccess.assertCanEditVendor(userId, vendorId);
		await this.ensureVendorDefaults(vendorId);
		return this.prisma.shippingProfile.findMany({
			where: { vendorId },
			include: { rates: { orderBy: { amountCents: 'asc' } } },
			orderBy: { code: 'asc' },
		});
	}

	async upsertProfile(
		userId: string,
		vendorId: string,
		input: {
			code: string;
			name: string;
			shipsSeparately?: boolean;
			payoutTrigger?: PayoutTrigger;
			rates?: Array<{
				id?: string;
				label: string;
				amountCents: number;
				minSubtotalCents?: number | null;
				maxSubtotalCents?: number | null;
			}>;
		},
	) {
		await this.vendorAccess.assertCanEditVendor(userId, vendorId);
		const code = input.code.trim().toUpperCase();
		const shipsSeparately =
			input.shipsSeparately ?? (code === 'FREIGHT' ? true : false);
		const payoutTrigger =
			input.payoutTrigger ??
			(shipsSeparately || code === 'FREIGHT'
				? PayoutTrigger.ON_SHIPMENT
				: PayoutTrigger.ON_PAYMENT);

		const profile = await this.prisma.shippingProfile.upsert({
			where: {
				vendorId_code: { vendorId, code },
			},
			create: {
				vendorId,
				code,
				name: input.name.trim(),
				shipsSeparately,
				payoutTrigger,
			},
			update: {
				name: input.name.trim(),
				shipsSeparately,
				payoutTrigger,
			},
		});

		if(input.rates) {
			const keepIds: string[] = [];
			for(const rate of input.rates) {
				if(rate.id) {
					const updated = await this.prisma.shippingRate.updateMany({
						where: { id: rate.id, profileId: profile.id },
						data: {
							label: rate.label,
							amountCents: rate.amountCents,
							minSubtotalCents: rate.minSubtotalCents ?? null,
							maxSubtotalCents: rate.maxSubtotalCents ?? null,
						},
					});
					if(updated.count > 0) {
						keepIds.push(rate.id);
					}
				}
				else {
					const created = await this.prisma.shippingRate.create({
						data: {
							profileId: profile.id,
							label: rate.label,
							amountCents: rate.amountCents,
							minSubtotalCents: rate.minSubtotalCents ?? null,
							maxSubtotalCents: rate.maxSubtotalCents ?? null,
						},
					});
					keepIds.push(created.id);
				}
			}

			await this.prisma.shippingRate.deleteMany({
				where: {
					profileId: profile.id,
					id: { notIn: keepIds },
				},
			});
		}

		return this.prisma.shippingProfile.findUniqueOrThrow({
			where: { id: profile.id },
			include: { rates: { orderBy: { amountCents: 'asc' } } },
		});
	}

	async assignProductProfile(
		userId: string,
		productId: string,
		shippingProfileId: string | null,
	) {
		const product = await this.prisma.catalogProduct.findUnique({
			where: { id: productId },
		});
		if(!product) {
			throw new NotFoundException('Product not found.');
		}
		await this.vendorAccess.assertCanEditVendor(userId, product.vendorId);

		if(shippingProfileId) {
			const profile = await this.prisma.shippingProfile.findFirst({
				where: { id: shippingProfileId, vendorId: product.vendorId },
			});
			if(!profile) {
				throw new NotFoundException('Shipping profile not found for vendor.');
			}
		}

		return this.prisma.catalogProduct.update({
			where: { id: productId },
			data: { shippingProfileId },
			select: {
				id: true,
				shippingProfileId: true,
			},
		});
	}
}
