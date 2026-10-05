import {
  BrokenPackStatus,
  PrismaClient,
  ProductOfferingRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export async function seedCatalog(prisma: PrismaClient): Promise<void> {
  const uomRows = [
    { code: 'FT', label: 'Foot', dimensionKey: 'length', factorToReference: new Decimal('0.3048') },
    { code: 'IN', label: 'Inch', dimensionKey: 'length', factorToReference: new Decimal('0.0254') },
    { code: 'MM', label: 'Millimeter', dimensionKey: 'length', factorToReference: new Decimal('0.001') },
    { code: 'M', label: 'Meter', dimensionKey: 'length', factorToReference: new Decimal('1') },
    { code: 'EA', label: 'Each', dimensionKey: 'count', factorToReference: new Decimal('1') },
    { code: 'PK', label: 'Pack', dimensionKey: 'count', factorToReference: new Decimal('1') },
    { code: 'BX', label: 'Box', dimensionKey: 'count', factorToReference: new Decimal('1') },
    { code: 'SPOOL', label: 'Spool', dimensionKey: 'count', factorToReference: new Decimal('1') },
    { code: 'LB', label: 'Pound', dimensionKey: 'weight', factorToReference: new Decimal('0.45359237') },
    { code: 'KG', label: 'Kilogram', dimensionKey: 'weight', factorToReference: new Decimal('1') },
  ];

  for(const row of uomRows) {
    await prisma.unitOfMeasure.upsert({
      where: { code: row.code },
      create: row,
      update: {
        label: row.label,
        dimensionKey: row.dimensionKey,
        factorToReference: row.factorToReference,
      },
    });
  }

  const category = await prisma.catalogCategory.upsert({
    where: { slug: 'wire-and-cable' },
    create: { slug: 'wire-and-cable', name: 'Wire & Cable' },
    update: { name: 'Wire & Cable' },
  });

  const vendor = await prisma.vendor.upsert({
    where: { slug: 'demo-supply' },
    create: { slug: 'demo-supply', name: 'Demo Supply Co.' },
    update: { name: 'Demo Supply Co.' },
  });

  const uomSpool = await prisma.unitOfMeasure.findUniqueOrThrow({ where: { code: 'SPOOL' } });
  const uomFt = await prisma.unitOfMeasure.findUniqueOrThrow({ where: { code: 'FT' } });

  const product = await prisma.catalogProduct.upsert({
    where: {
      vendorId_sku: {
        vendorId: vendor.id,
        sku: 'WIRE-THHN-12-500',
      },
    },
    create: {
      vendorId: vendor.id,
      categoryId: category.id,
      sku: 'WIRE-THHN-12-500',
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
        uomId: uomSpool.id,
        role: ProductOfferingRole.PACK,
        priceCents: 8999,
        qtyOnHand: new Decimal('2'),
        tracksOwnQty: true,
      },
    });
  }

  if(!pieceOffering) {
    pieceOffering = await prisma.productOffering.create({
      data: {
        productId: product.id,
        uomId: uomFt.id,
        role: ProductOfferingRole.PIECE,
        priceCents: 22,
        qtyOnHand: new Decimal('0'),
        tracksOwnQty: false,
      },
    });
  }

  await prisma.packPieceLink.upsert({
    where: {
      packOfferingId_pieceOfferingId: {
        packOfferingId: packOffering.id,
        pieceOfferingId: pieceOffering.id,
      },
    },
    create: {
      packOfferingId: packOffering.id,
      pieceOfferingId: pieceOffering.id,
      pieceQtyPerPack: new Decimal('500'),
    },
    update: { pieceQtyPerPack: new Decimal('500') },
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
