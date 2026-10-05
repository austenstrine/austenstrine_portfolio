import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductOfferingRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { InventoryService } from './inventory/inventory.service';
import { VendorAccessService } from './vendor-access.service';
import { CreateBrokenPackDto } from './dto/create-broken-pack.dto';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { TrimInventoryDto } from './dto/trim-inventory.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';

const productInclude = {
  vendor: true,
  category: true,
  attributes: { orderBy: { sortOrder: 'asc' as const } },
  offerings: {
    include: {
      uom: true,
      packLinksAsPack: { include: { pieceOffering: { include: { uom: true } } } },
      packLinksAsPiece: { include: { packOffering: { include: { uom: true } } } },
    },
  },
} satisfies Prisma.CatalogProductInclude;

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventory: InventoryService,
    private readonly vendorAccess: VendorAccessService,
  ) {}

  listUoms() {
    return this.prisma.unitOfMeasure.findMany({ orderBy: { code: 'asc' } });
  }

  listCategories() {
    return this.prisma.catalogCategory.findMany({ orderBy: { name: 'asc' } });
  }

  async searchProducts(query: {
    q?: string;
    categorySlug?: string;
    vendorSlug?: string;
    limit?: number;
  }) {
    const where: Prisma.CatalogProductWhereInput = { active: true };

    if(query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { sku: { contains: query.q, mode: 'insensitive' } },
        { description: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    if(query.categorySlug) {
      where.category = { slug: query.categorySlug };
    }

    if(query.vendorSlug) {
      where.vendor = { slug: query.vendorSlug };
    }

    const products = await this.prisma.catalogProduct.findMany({
      where,
      include: {
        vendor: true,
        category: true,
        offerings: { include: { uom: true } },
      },
      orderBy: { title: 'asc' },
      take: query.limit ?? 50,
    });

    return products.map((product) => this.toSummary(product));
  }

  async getProduct(vendorSlug: string, productSlug: string, viewerUserId?: string) {
    const product = await this.prisma.catalogProduct.findFirst({
      where: {
        slug: productSlug,
        vendor: { slug: vendorSlug },
        active: true,
      },
      include: productInclude,
    });

    if(!product) {
      throw new NotFoundException('Product not found.');
    }

    const canEdit = await this.vendorAccess.canEditProduct(viewerUserId, product.id);

    return {
      ...this.toDetail(product),
      permissions: { canEdit },
    };
  }

  async createProduct(userId: string, dto: CreateCatalogProductDto) {
    await this.vendorAccess.assertCanEditVendor(userId, dto.vendorId);

    const product = await this.prisma.catalogProduct.create({
      data: {
        vendorId: dto.vendorId,
        categoryId: dto.categoryId,
        sku: dto.sku,
        slug: dto.slug,
        title: dto.title,
        description: dto.description,
        inventoryFromAllocations: dto.inventoryFromAllocations ?? false,
        attributes: {
          create: dto.attributes?.map((row, index) => ({
            key: row.key,
            value: row.value,
            sortOrder: row.sortOrder ?? index,
          })),
        },
        offerings: {
          create: dto.offerings.map((offering) => ({
            uomId: offering.uomId,
            role: offering.role,
            priceCents: offering.priceCents,
            currency: offering.currency ?? 'USD',
            qtyOnHand: offering.qtyOnHand ?? 0,
            tracksOwnQty: offering.tracksOwnQty ?? true,
          })),
        },
      },
      include: productInclude,
    });

    await this.linkPackPiecePairs(product.id, dto);
    await this.inventory.refreshProductAvailability(product.id);

    return this.getProductById(product.id, userId);
  }

  async updateProduct(userId: string, productId: string, dto: UpdateCatalogProductDto) {
    await this.vendorAccess.assertCanEditProduct(userId, productId);

    await this.prisma.catalogProduct.update({
      where: { id: productId },
      data: {
        title: dto.title,
        description: dto.description,
        active: dto.active,
        inventoryFromAllocations: dto.inventoryFromAllocations,
        categoryId: dto.categoryId,
      },
    });

    if(dto.attributes) {
      await this.prisma.$transaction(
        dto.attributes.map((row, index) =>
          this.prisma.productAttribute.upsert({
            where: {
              productId_key: {
                productId,
                key: row.key,
              },
            },
            create: {
              productId,
              key: row.key,
              value: row.value,
              sortOrder: row.sortOrder ?? index,
            },
            update: {
              value: row.value,
              sortOrder: row.sortOrder ?? index,
            },
          }),
        ),
      );
    }

    if(dto.offerings) {
      for(const offering of dto.offerings) {
        await this.prisma.productOffering.update({
          where: { id: offering.id },
          data: {
            priceCents: offering.priceCents,
            qtyOnHand: offering.qtyOnHand,
            tracksOwnQty: offering.tracksOwnQty,
          },
        });
      }
    }

    await this.inventory.refreshProductAvailability(productId);

    return this.getProductById(productId, userId);
  }

  async createBrokenPack(userId: string, dto: CreateBrokenPackDto) {
    const packOffering = await this.prisma.productOffering.findUnique({
      where: { id: dto.packOfferingId },
      include: { product: true },
    });

    if(!packOffering) {
      throw new NotFoundException('Pack offering not found.');
    }

    await this.vendorAccess.assertCanEditProduct(userId, packOffering.productId);

    const broken = await this.prisma.brokenPack.create({
      data: {
        packOfferingId: dto.packOfferingId,
        label: dto.label,
        remainingQty: new Decimal(dto.remainingQty),
      },
    });

    await this.inventory.refreshOfferingAvailability(dto.packOfferingId);

    const link = await this.prisma.packPieceLink.findFirst({
      where: { packOfferingId: dto.packOfferingId },
    });

    if(link) {
      await this.inventory.refreshOfferingAvailability(link.pieceOfferingId);
    }

    return broken;
  }

  trimInventory(userId: string, dto: TrimInventoryDto) {
    return this.trimWithPermission(userId, dto);
  }

  private async trimWithPermission(userId: string, dto: TrimInventoryDto) {
    const offering = await this.prisma.productOffering.findUnique({
      where: { id: dto.pieceOfferingId },
      include: { product: true },
    });

    if(!offering) {
      throw new NotFoundException('Offering not found.');
    }

    await this.vendorAccess.assertCanEditProduct(userId, offering.productId);

    return this.inventory.trimPieceQuantity({
      pieceOfferingId: dto.pieceOfferingId,
      quantityInPieceUom: new Decimal(dto.quantityInPieceUom),
      strategy: dto.strategy,
      leewayAbs: dto.leewayAbs ? new Decimal(dto.leewayAbs) : undefined,
      leewayRatio: dto.leewayRatio ? new Decimal(dto.leewayRatio) : undefined,
      dryRun: dto.dryRun,
    });
  }

  private async getProductById(productId: string, viewerUserId?: string) {
    const product = await this.prisma.catalogProduct.findUnique({
      where: { id: productId },
      include: productInclude,
    });

    if(!product) {
      throw new NotFoundException('Product not found.');
    }

    const canEdit = await this.vendorAccess.canEditProduct(viewerUserId, product.id);

    return {
      ...this.toDetail(product),
      permissions: { canEdit },
    };
  }

  private async linkPackPiecePairs(productId: string, dto: CreateCatalogProductDto) {
    if(!dto.packPieceLink) {
      return;
    }

    const offerings = await this.prisma.productOffering.findMany({ where: { productId } });
    const pack = offerings.find((row) => row.role === ProductOfferingRole.PACK);
    const piece = offerings.find((row) => row.role === ProductOfferingRole.PIECE);

    if(!pack || !piece) {
      return;
    }

    await this.prisma.packPieceLink.create({
      data: {
        packOfferingId: pack.id,
        pieceOfferingId: piece.id,
        pieceQtyPerPack: new Decimal(dto.packPieceLink.pieceQtyPerPack),
      },
    });

    if(dto.inventoryFromAllocations) {
      await this.prisma.productOffering.update({
        where: { id: piece.id },
        data: { tracksOwnQty: false, qtyOnHand: 0 },
      });
    }
  }

  private toSummary(
    product: Prisma.CatalogProductGetPayload<{
      include: { vendor: true; category: true; offerings: { include: { uom: true } } };
    }>,
  ) {
    const primaryOffering = product.offerings[0];

    return {
      id: product.id,
      vendor: { slug: product.vendor.slug, name: product.vendor.name },
      category: product.category
        ? { slug: product.category.slug, name: product.category.name }
        : null,
      sku: product.sku,
      slug: product.slug,
      title: product.title,
      description: product.description,
      inventoryFromAllocations: product.inventoryFromAllocations,
      primaryPriceCents: primaryOffering?.priceCents ?? null,
      primaryUom: primaryOffering?.uom.code ?? null,
      availableQty: primaryOffering?.availableQty.toString() ?? '0',
      offerings: product.offerings.map((offering) => ({
        id: offering.id,
        role: offering.role,
        priceCents: offering.priceCents,
        uom: offering.uom.code,
        availableQty: offering.availableQty.toString(),
      })),
    };
  }

  private toDetail(
    product: Prisma.CatalogProductGetPayload<{ include: typeof productInclude }>,
  ) {
    return {
      id: product.id,
      vendor: { slug: product.vendor.slug, name: product.vendor.name },
      category: product.category
        ? { slug: product.category.slug, name: product.category.name }
        : null,
      sku: product.sku,
      slug: product.slug,
      title: product.title,
      description: product.description,
      inventoryFromAllocations: product.inventoryFromAllocations,
      attributes: product.attributes,
      offerings: product.offerings.map((offering) => ({
        id: offering.id,
        role: offering.role,
        priceCents: offering.priceCents,
        currency: offering.currency,
        qtyOnHand: offering.qtyOnHand.toString(),
        availableQty: offering.availableQty.toString(),
        tracksOwnQty: offering.tracksOwnQty,
        uom: {
          code: offering.uom.code,
          label: offering.uom.label,
          dimensionKey: offering.uom.dimensionKey,
        },
        packLink: offering.packLinksAsPack[0]
          ? {
              pieceOfferingId: offering.packLinksAsPack[0].pieceOfferingId,
              pieceQtyPerPack: offering.packLinksAsPack[0].pieceQtyPerPack.toString(),
              pieceUom: offering.packLinksAsPack[0].pieceOffering.uom.code,
            }
          : null,
        pieceLink: offering.packLinksAsPiece[0]
          ? {
              packOfferingId: offering.packLinksAsPiece[0].packOfferingId,
              pieceQtyPerPack: offering.packLinksAsPiece[0].pieceQtyPerPack.toString(),
              packUom: offering.packLinksAsPiece[0].packOffering.uom.code,
            }
          : null,
      })),
    };
  }
}
