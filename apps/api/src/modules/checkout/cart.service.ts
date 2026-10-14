import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class CartService {
	constructor(private readonly prisma: PrismaService) {}

	async getOrCreateCart(buyerId: string) {
		return this.prisma.cart.upsert({
			where: { buyerId },
			create: { buyerId },
			update: {},
			include: this.cartInclude(),
		});
	}

	async getCart(buyerId: string) {
		const cart = await this.getOrCreateCart(buyerId);
		return this.toCartDto(cart);
	}

	async upsertLine(buyerId: string, offeringId: string, quantityRaw: string) {
		const quantity = new Decimal(quantityRaw);
		if(quantity.lte(0)) {
			throw new BadRequestException('Quantity must be greater than zero.');
		}

		const offering = await this.prisma.productOffering.findUnique({
			where: { id: offeringId },
			include: {
				product: { select: { active: true, title: true, vendorId: true } },
				uom: true,
			},
		});

		if(!offering || !offering.product.active) {
			throw new NotFoundException('Offering not found or inactive.');
		}

		if(offering.availableQty.lt(quantity)) {
			throw new BadRequestException(
				`Only ${offering.availableQty.toString()} available for this offering.`,
			);
		}

		const cart = await this.getOrCreateCart(buyerId);
		await this.prisma.cartLine.upsert({
			where: {
				cartId_offeringId: {
					cartId: cart.id,
					offeringId,
				},
			},
			create: {
				cartId: cart.id,
				offeringId,
				quantity,
			},
			update: { quantity },
		});

		return this.getCart(buyerId);
	}

	async removeLine(buyerId: string, offeringId: string) {
		const cart = await this.getOrCreateCart(buyerId);
		await this.prisma.cartLine.deleteMany({
			where: { cartId: cart.id, offeringId },
		});
		return this.getCart(buyerId);
	}

	async clearCart(buyerId: string) {
		const cart = await this.getOrCreateCart(buyerId);
		await this.prisma.cartLine.deleteMany({ where: { cartId: cart.id } });
		return this.getCart(buyerId);
	}

	private cartInclude() {
		return {
			lines: {
				include: {
					offering: {
						include: {
							uom: true,
							product: {
								include: {
									vendor: true,
									shippingProfile: { include: { rates: true } },
								},
							},
						},
					},
				},
				orderBy: { createdAt: 'asc' as const },
			},
		};
	}

	private toCartDto(
		cart: Awaited<ReturnType<CartService['getOrCreateCart']>>,
	) {
		return {
			id: cart.id,
			lineCount: cart.lines.length,
			lines: cart.lines.map((line) => ({
				id: line.id,
				offeringId: line.offeringId,
				quantity: line.quantity.toString(),
				availableQty: line.offering.availableQty.toString(),
				unitPriceCents: line.offering.priceCents,
				currency: line.offering.currency,
				lineTotalCents: Math.round(
					Number(line.quantity) * line.offering.priceCents,
				),
				sku: line.offering.sku,
				offeringKey: line.offering.offeringKey,
				role: line.offering.role,
				uom: line.offering.uom.code,
				title: line.offering.product.title,
				productSlug: line.offering.product.slug,
				vendor: {
					id: line.offering.product.vendor.id,
					slug: line.offering.product.vendor.slug,
					name: line.offering.product.vendor.name,
				},
				shippingProfileId: line.offering.product.shippingProfileId,
			})),
		};
	}
}
