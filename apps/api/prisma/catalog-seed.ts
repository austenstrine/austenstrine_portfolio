import { readFileSync } from 'fs';
import { join } from 'path';
import {
	BrokenPackStatus,
	PrismaClient,
	ProductOfferingRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { ensureSupervendor } from '../src/modules/catalog/ensure-supervendor';
import { seedGlobalUoms } from '../src/modules/catalog/seed-global-uoms';

function demoVendorFromSeed(): {
	id: string;
	slug: string;
	name: string;
	isSuperVendor: boolean;
} {
	const file = JSON.parse(readFileSync(join(__dirname, 'seed-data/Vendor.json'), 'utf8')) as {
		records?: Array<{ id: string; slug: string; name: string; isSuperVendor: boolean }>;
	};
	const row = file.records?.[0];
	if(!row?.id || !row.slug || !row.name) {
		throw new Error('Vendor.json is missing the demo vendor record.');
	}
	return row;
}

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
	await seedGlobalUoms(prisma);

	let category = await prisma.catalogCategory.findUnique({
		where: { slug: 'wire-and-cable' },
	});
	if(!category) {
		category = await prisma.catalogCategory.create({
			data: { slug: 'wire-and-cable', name: 'Wire & Cable' },
		});
	}

	await ensureSupervendor(prisma, join(__dirname, 'seed-data'));

	const demoVendor = demoVendorFromSeed();
	const vendor = await prisma.vendor.upsert({
		where: { slug: demoVendor.slug },
		create: {
			id: demoVendor.id,
			slug: demoVendor.slug,
			name: demoVendor.name,
			isSuperVendor: demoVendor.isSuperVendor,
		},
		update: {
			name: demoVendor.name,
			isSuperVendor: demoVendor.isSuperVendor,
		},
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
		},
		update: {
			title: 'THHN 12 AWG Copper Wire',
			description: 'Demo listing sold as full spools or by the foot with shared inventory.',
			inventoryFromAllocations: true,
			categoryId: category.id,
		},
		include: { offerings: true },
	});

	for(const [index, pair] of [
		{ key: 'Gauge', value: '12 AWG' },
		{ key: 'Conductor', value: 'Copper' },
		{ key: 'Insulation', value: 'THHN' },
	].entries()) {
		let definition = await prisma.attribute.findFirst({
			where: { name: { equals: pair.key, mode: 'insensitive' }, vendorId: null },
		});
		if(!definition) {
			definition = await prisma.attribute.create({
				data: { name: pair.key, vendorId: null },
			});
		}
		let valueRow = await prisma.attributeValue.findFirst({
			where: {
				attributeId: definition.id,
				value: pair.value,
				vendorId: null,
			},
		});
		if(!valueRow) {
			valueRow = await prisma.attributeValue.create({
				data: {
					attributeId: definition.id,
					value: pair.value,
					vendorId: null,
					sortOrder: index,
				},
			});
		}
		await prisma.productAttributeValue.upsert({
			where: {
				productId_attributeValueId: {
					productId: product.id,
					attributeValueId: valueRow.id,
				},
			},
			create: {
				productId: product.id,
				attributeValueId: valueRow.id,
				sortOrder: index,
			},
			update: { sortOrder: index },
		});
	}

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
