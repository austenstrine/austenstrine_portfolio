import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { CartService } from './cart.service';

function activeOffering(overrides?: {
	availableQty?: string;
	active?: boolean;
	priceCents?: number;
}) {
	return {
		id: 'off_1',
		sku: 'SKU-1',
		offeringKey: 'EACH',
		role: 'PIECE',
		priceCents: overrides?.priceCents ?? 500,
		currency: 'USD',
		availableQty: new Decimal(overrides?.availableQty ?? '10'),
		uom: { code: 'EA', omitFromAvailability: true },
		product: {
			active: overrides?.active ?? true,
			title: 'Widget',
			vendorId: 'vendor_1',
			slug: 'widget',
			vendor: { id: 'vendor_1', slug: 'demo', name: 'Demo' },
			shippingProfileId: null,
			shippingProfile: null,
		},
	};
}

function buildService(offering: ReturnType<typeof activeOffering> | null) {
	const cartRow = {
		id: 'cart_1',
		buyerId: 'buyer_1',
		lines: [
			{
				id: 'line_1',
				offeringId: 'off_1',
				quantity: new Decimal('2'),
				offering: offering ?? activeOffering(),
			},
		],
	};

	const prisma = {
		productOffering: {
			findUnique: jest.fn().mockResolvedValue(offering),
		},
		cart: {
			upsert: jest.fn().mockResolvedValue(cartRow),
		},
		cartLine: {
			upsert: jest.fn().mockResolvedValue({}),
			deleteMany: jest.fn(),
		},
	};

	const service = new CartService(prisma as never);
	return { service, prisma, cartRow };
}

describe('CartService.upsertLine (buyer cart gates)', () => {
	it('404s when offering is missing or product is inactive', async () => {
		const missing = buildService(null);
		await expect(
			missing.service.upsertLine('buyer_1', 'off_gone', '1'),
		).rejects.toBeInstanceOf(NotFoundException);

		const inactive = buildService(activeOffering({ active: false }));
		await expect(
			inactive.service.upsertLine('buyer_1', 'off_1', '1'),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(inactive.prisma.cartLine.upsert).not.toHaveBeenCalled();
	});

	it('rejects qty <= 0 and oversell', async () => {
		const { service, prisma } = buildService(activeOffering({ availableQty: '3' }));

		await expect(
			service.upsertLine('buyer_1', 'off_1', '0'),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(
			service.upsertLine('buyer_1', 'off_1', '4'),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(prisma.cartLine.upsert).not.toHaveBeenCalled();
	});

	it('upserts a valid line and returns server-priced cart totals', async () => {
		const offering = activeOffering({ availableQty: '10', priceCents: 500 });
		const { service, prisma } = buildService(offering);

		const cart = await service.upsertLine('buyer_1', 'off_1', '2');

		expect(prisma.cartLine.upsert).toHaveBeenCalledTimes(1);
		const upsertArg = prisma.cartLine.upsert.mock.calls[0][0];
		expect(upsertArg.create.quantity.toString()).toBe('2');
		expect(cart.lines[0].unitPriceCents).toBe(500);
		expect(cart.lines[0].lineTotalCents).toBe(1000);
		expect(cart.lines[0].title).toBe('Widget');
	});
});
