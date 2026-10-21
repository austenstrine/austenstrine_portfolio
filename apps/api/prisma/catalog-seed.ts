import { readFileSync } from 'fs';
import { join } from 'path';
import {
	BrokenPackStatus,
	PrismaClient,
	ProductOfferingRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ensureSupervendor } from '../src/modules/catalog/ensure-supervendor';

type UomSeedRow = {
	code: string;
	label: string;
	dimensionKey: string;
	factorToReference: string;
	aliases: string[];
};

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
	const uomRows = loadUomRows();

	for(const row of uomRows) {
		const existing = await prisma.unitOfMeasure.findFirst({
			where: { vendorId: null, code: row.code },
		});
		if(existing) {
			await prisma.unitOfMeasure.update({
				where: { id: existing.id },
				data: {
					label: row.label,
					dimensionKey: row.dimensionKey,
					factorToReference: new Decimal(row.factorToReference),
					aliases: row.aliases,
					vendorId: null,
				},
			});
		}
		else {
			await prisma.unitOfMeasure.create({
				data: {
					code: row.code,
					label: row.label,
					dimensionKey: row.dimensionKey,
					factorToReference: new Decimal(row.factorToReference),
					aliases: row.aliases,
					vendorId: null,
				},
			});
		}
	}

	let category = await prisma.catalogCategory.findUnique({
		where: { slug: 'wire-and-cable' },
	});
	if(!category) {
		category = await prisma.catalogCategory.create({
			data: { slug: 'wire-and-cable', name: 'Wire & Cable' },
		});
	}

	await ensureSupervendor(prisma, join(__dirname, 'seed-data'));

	const vendor = await prisma.vendor.upsert({
		where: { slug: 'demo-supply' },
		create: { slug: 'demo-supply', name: 'Demo Supply Co.', isSuperVendor: false },
		update: { name: 'Demo Supply Co.', isSuperVendor: false },
	});

	const uomSpool = await prisma.unitOfMeasure.findFirstOrThrow({
		where: { vendorId: null, code: 'SPOOL' },
	});
	const uomFt = await prisma.unitOfMeasure.findFirstOrThrow({
		where: { vendorId: null, code: 'FT' },
	});

	const product = await prisma.catalogProduct.upsert({
		where: {
			vendorId_slug: {
				vendorId: vendor.id,
				slug: 'thhn-12-gauge-wire-500ft',
			},
		},
		create: {
			vendorId: vendor.id,
			categoryId: category.id,
			slug: 'thhn-12-gauge-wire-500ft',
			title: 'THHN 12 AWG Copper Wire',
			description: 'Demo listing sold as full spools or by the foot with shared inventory.',
			inventoryFromAllocations: true,
			attributes: {
				create: [
					{ key: 'gauge', value: '12 AWG', sortOrder: 0 },
					{ key: 'conductor', value: 'Copper', sortOrder: 1 },
					{ key: 'insulation', value: 'THHN', sortOrder: 2 },
				],
			},
		},
		update: {
			title: 'THHN 12 AWG Copper Wire',
			description: 'Demo listing sold as full spools or by the foot with shared inventory.',
			inventoryFromAllocations: true,
			categoryId: category.id,
		},
		include: { offerings: true },
	});

	let packOffering = product.offerings.find((row) => row.role === ProductOfferingRole.PACK);
	let pieceOffering = product.offerings.find((row) => row.role === ProductOfferingRole.PIECE);

	if(!packOffering) {
		packOffering = await prisma.productOffering.create({
			data: {
				productId: product.id,
				vendorId: vendor.id,
				sku: 'WIRE-THHN-12-SPOOL',
				offeringKey: 'spool',
				uomId: uomSpool.id,
				role: ProductOfferingRole.PACK,
				priceCents: 8999,
				qtyOnHand: new Decimal('2'),
				tracksOwnQty: true,
				minUnbrokenQty: new Decimal('0'),
				breakPoolAboveQty: new Decimal('0'),
				inheritQtyToChildren: true,
			},
		});
	}

	if(!pieceOffering) {
		pieceOffering = await prisma.productOffering.create({
			data: {
				productId: product.id,
				vendorId: vendor.id,
				sku: 'WIRE-THHN-12-FT',
				offeringKey: 'foot',
				uomId: uomFt.id,
				role: ProductOfferingRole.PIECE,
				priceCents: 22,
				qtyOnHand: new Decimal('0'),
				tracksOwnQty: false,
				minUnbrokenQty: new Decimal('-1'),
				breakPoolAboveQty: new Decimal('0'),
				inheritQtyToChildren: false,
			},
		});
	}

	await prisma.offeringContainment.upsert({
		where: {
			parentOfferingId_childOfferingId: {
				parentOfferingId: packOffering.id,
				childOfferingId: pieceOffering.id,
			},
		},
		create: {
			parentOfferingId: packOffering.id,
			childOfferingId: pieceOffering.id,
			childQtyPerParent: new Decimal('500'),
		},
		update: { childQtyPerParent: new Decimal('500') },
	});

	const existingBroken = await prisma.brokenPack.count({
		where: { packOfferingId: packOffering.id },
	});

	if(existingBroken === 0) {
		await prisma.brokenPack.createMany({
			data: [
				{
					packOfferingId: packOffering.id,
					label: 'Partial spool A',
					remainingQty: new Decimal('322'),
					status: BrokenPackStatus.ACTIVE,
				},
				{
					packOfferingId: packOffering.id,
					label: 'Partial spool B',
					remainingQty: new Decimal('118'),
					status: BrokenPackStatus.ACTIVE,
				},
			],
		});
	}

	await prisma.productOffering.update({
		where: { id: packOffering.id },
		data: { qtyOnHand: new Decimal('0'), availableQty: new Decimal('0') },
	});

	await prisma.productOffering.update({
		where: { id: pieceOffering.id },
		data: { availableQty: new Decimal('440') },
	});
}

function loadUomRows(): UomSeedRow[] {
	const file = JSON.parse(
		readFileSync(join(__dirname, 'seed-data', 'UnitOfMeasure.json'), 'utf8'),
	) as { records?: UomSeedRow[] };
	if(!Array.isArray(file.records)) {
		throw new Error('UnitOfMeasure.json is missing records[].');
	}
	return file.records;
}
