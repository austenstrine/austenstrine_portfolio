import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BrokenPackStatus,
  InventoryClaimStatus,
  ProductOfferingRole,
  Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import {
  allocateFromSupplies,
  computeMaxSingleUnitQty,
  sumDecimals,
  type SupplyUnit,
  type TrimStrategy,
} from './inventory-math';

const zero = new Decimal(0);

export type AvailabilitySnapshot = {
  offeringId: string;
  availableQty: string;
  maxSingleUnitQty: string | null;
  unclaimedWholePacks: string;
  activeBrokenPackCount: number;
};

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async refreshOfferingAvailability(offeringId: string): Promise<AvailabilitySnapshot> {
    const offering = await this.prisma.productOffering.findUnique({
      where: { id: offeringId },
      include: {
        packLinksAsPiece: {
          include: {
            packOffering: {
              include: {
                brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
              },
            },
          },
        },
        brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
      },
    });

    if(!offering) {
      throw new NotFoundException('Offering not found.');
    }

    const snapshot = await this.computeAvailability(offering);
    await this.prisma.productOffering.update({
      where: { id: offeringId },
      data: { availableQty: snapshot.availableQty },
    });

    if(offering.role === ProductOfferingRole.PIECE) {
      const pieceLinks = offering.packLinksAsPiece;
      for(const link of pieceLinks) {
        await this.refreshPackOfferingAvailability(link.packOfferingId, link.pieceQtyPerPack);
      }
    }

    return {
      offeringId,
      availableQty: snapshot.availableQty.toString(),
      maxSingleUnitQty: snapshot.maxSingleUnitQty?.toString() ?? null,
      unclaimedWholePacks: snapshot.unclaimedWholePacks.toString(),
      activeBrokenPackCount: snapshot.activeBrokenPackCount,
    };
  }

  async refreshProductAvailability(productId: string): Promise<void> {
    const offerings = await this.prisma.productOffering.findMany({
      where: { productId },
      select: { id: true },
    });

    for(const offering of offerings) {
      await this.refreshOfferingAvailability(offering.id);
    }
  }

  async trimPieceQuantity(input: {
    pieceOfferingId: string;
    quantityInPieceUom: Decimal;
    strategy?: TrimStrategy;
    leewayAbs?: Decimal;
    leewayRatio?: Decimal;
    dryRun?: boolean;
  }): Promise<{ allocations: Array<{ brokenPackId?: string; wholePackTaken: boolean; takeInPieceUom: string }> }> {
    const link = await this.prisma.packPieceLink.findFirst({
      where: { pieceOfferingId: input.pieceOfferingId },
      include: {
        packOffering: {
          include: {
            brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
          },
        },
      },
    });

    if(!link) {
      throw new BadRequestException('This offering is not linked to a pack offering.');
    }

    const supplies = this.buildSupplies(link.packOffering, link.pieceQtyPerPack);
    const { allocations, remaining } = allocateFromSupplies(
      input.quantityInPieceUom,
      supplies,
      input.strategy ?? 'WHOLE_UNITS_FIRST',
      input.leewayAbs ?? zero,
      input.leewayRatio ?? zero,
    );

    if(remaining.gt(0)) {
      throw new BadRequestException('Insufficient inventory for requested quantity.');
    }

    if(input.dryRun) {
      return {
        allocations: allocations.map((row) => ({
          brokenPackId: row.kind === 'broken' ? row.supplyId : undefined,
          wholePackTaken: row.kind === 'whole',
          takeInPieceUom: row.takeInPieceUom.toString(),
        })),
      };
    }

    await this.applyTrimAllocations(link.packOfferingId, link.pieceQtyPerPack, allocations);
    await this.refreshOfferingAvailability(input.pieceOfferingId);
    await this.refreshOfferingAvailability(link.packOfferingId);

    return {
      allocations: allocations.map((row) => ({
        brokenPackId: row.kind === 'broken' ? row.supplyId : undefined,
        wholePackTaken: row.kind === 'whole',
        takeInPieceUom: row.takeInPieceUom.toString(),
      })),
    };
  }

  async createClaim(input: {
    orderRef: string;
    offeringId: string;
    quantity: Decimal;
    brokenPackId?: string;
  }) {
    const offering = await this.prisma.productOffering.findUnique({
      where: { id: input.offeringId },
      include: { packLinksAsPiece: true },
    });

    if(!offering) {
      throw new NotFoundException('Offering not found.');
    }

    let quantityInPieceUom: Decimal | null = null;
    if(offering.role === ProductOfferingRole.PIECE && offering.packLinksAsPiece[0]) {
      quantityInPieceUom = input.quantity;
    }

    const order = await this.prisma.marketplaceOrder.upsert({
      where: { orderRef: input.orderRef },
      create: { orderRef: input.orderRef },
      update: {},
    });

    const claim = await this.prisma.inventoryClaim.create({
      data: {
        orderId: order.id,
        offeringId: input.offeringId,
        brokenPackId: input.brokenPackId,
        quantity: input.quantity,
        quantityInPieceUom,
        status: InventoryClaimStatus.PENDING,
      },
    });

    await this.refreshOfferingAvailability(input.offeringId);

    return claim;
  }

  private async refreshPackOfferingAvailability(
    packOfferingId: string,
    pieceQtyPerPack: Decimal,
  ): Promise<void> {
    const packOffering = await this.prisma.productOffering.findUnique({
      where: { id: packOfferingId },
      include: {
        brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
        packLinksAsPack: true,
      },
    });

    if(!packOffering) {
      return;
    }

    const claimedWhole = await this.sumPendingClaims(packOfferingId);
    const unclaimedWhole = Decimal.max(packOffering.qtyOnHand.sub(claimedWhole), zero);
    await this.prisma.productOffering.update({
      where: { id: packOfferingId },
      data: { availableQty: unclaimedWhole },
    });

    const pieceLink = packOffering.packLinksAsPack[0];
    if(pieceLink) {
      await this.refreshOfferingAvailability(pieceLink.pieceOfferingId);
    }
  }

  private async computeAvailability(
    offering: Prisma.ProductOfferingGetPayload<{
      include: {
        packLinksAsPiece: {
          include: {
            packOffering: {
              include: { brokenPacks: true };
            };
          };
        };
        brokenPacks: true;
      };
    }>,
  ) {
    if(offering.role === ProductOfferingRole.PACK || offering.role === ProductOfferingRole.STANDALONE) {
      const claimed = await this.sumPendingClaims(offering.id);
      const available = offering.tracksOwnQty
        ? Decimal.max(offering.qtyOnHand.sub(claimed), zero)
        : offering.availableQty;

      return {
        availableQty: available,
        maxSingleUnitQty: null,
        unclaimedWholePacks: offering.role === ProductOfferingRole.PACK ? available : zero,
        activeBrokenPackCount: 0,
      };
    }

    const link = offering.packLinksAsPiece[0];
    if(!link) {
      const claimed = await this.sumPendingClaims(offering.id);
      const available = offering.tracksOwnQty
        ? Decimal.max(offering.qtyOnHand.sub(claimed), zero)
        : zero;

      return {
        availableQty: available,
        maxSingleUnitQty: available,
        unclaimedWholePacks: zero,
        activeBrokenPackCount: 0,
      };
    }

    const packOffering = link.packOffering;
    const claimedWhole = await this.sumPendingClaims(packOffering.id);
    const unclaimedWholePacks = Decimal.max(packOffering.qtyOnHand.sub(claimedWhole), zero);
    const wholeQty = unclaimedWholePacks.mul(link.pieceQtyPerPack);

    const brokenRemainders = packOffering.brokenPacks
      .filter((row) => row.status === BrokenPackStatus.ACTIVE)
      .map((row) => row.remainingQty);

    const brokenQty = sumDecimals(brokenRemainders);
    const claimedPiece = await this.sumPendingPieceClaims(offering.id);
    const availableQty = Decimal.max(wholeQty.add(brokenQty).sub(claimedPiece), zero);

    const maxSingleUnitQty = computeMaxSingleUnitQty(
      unclaimedWholePacks,
      link.pieceQtyPerPack,
      brokenRemainders,
    );

    return {
      availableQty,
      maxSingleUnitQty,
      unclaimedWholePacks,
      activeBrokenPackCount: brokenRemainders.length,
    };
  }

  private buildSupplies(
    packOffering: Prisma.ProductOfferingGetPayload<{ include: { brokenPacks: true } }>,
    pieceQtyPerPack: Decimal,
  ): SupplyUnit[] {
    const supplies: SupplyUnit[] = [];

    if(packOffering.qtyOnHand.gt(0)) {
      supplies.push({
        id: packOffering.id,
        kind: 'whole',
        remainingInPieceUom: packOffering.qtyOnHand.mul(pieceQtyPerPack),
      });
    }

    for(const broken of packOffering.brokenPacks) {
      if(broken.status !== BrokenPackStatus.ACTIVE || broken.remainingQty.lte(0)) {
        continue;
      }
      supplies.push({
        id: broken.id,
        kind: 'broken',
        remainingInPieceUom: broken.remainingQty,
      });
    }

    return supplies;
  }

  private async applyTrimAllocations(
    packOfferingId: string,
    pieceQtyPerPack: Decimal,
    allocations: Array<{ supplyId: string; kind: 'whole' | 'broken'; takeInPieceUom: Decimal }>,
  ): Promise<void> {
    for(const allocation of allocations) {
      if(allocation.kind === 'whole') {
        const take = allocation.takeInPieceUom;
        const fullSpools = take.div(pieceQtyPerPack).floor();
        const partial = take.mod(pieceQtyPerPack);
        const spoolsToConsume = partial.gt(0) ? fullSpools.add(1) : fullSpools;

        if(spoolsToConsume.gt(0)) {
          await this.prisma.productOffering.update({
            where: { id: packOfferingId },
            data: { qtyOnHand: { decrement: spoolsToConsume } },
          });
        }

        if(partial.gt(0)) {
          const openedRemainder = pieceQtyPerPack.sub(partial);
          if(openedRemainder.gt(0)) {
            await this.prisma.brokenPack.create({
              data: {
                packOfferingId,
                remainingQty: openedRemainder,
                status: BrokenPackStatus.ACTIVE,
                label: 'Auto-opened remainder',
              },
            });
          }
        }
        continue;
      }

      const broken = await this.prisma.brokenPack.findUnique({
        where: { id: allocation.supplyId },
      });

      if(!broken) {
        continue;
      }

      const next = broken.remainingQty.sub(allocation.takeInPieceUom);
      await this.prisma.brokenPack.update({
        where: { id: broken.id },
        data: {
          remainingQty: Decimal.max(next, zero),
          status: next.lte(0) ? BrokenPackStatus.DEPLETED : BrokenPackStatus.ACTIVE,
        },
      });
    }
  }

  private async sumPendingClaims(offeringId: string): Promise<Decimal> {
    const result = await this.prisma.inventoryClaim.aggregate({
      where: { offeringId, status: InventoryClaimStatus.PENDING },
      _sum: { quantity: true },
    });

    return result._sum.quantity ?? zero;
  }

  private async sumPendingPieceClaims(pieceOfferingId: string): Promise<Decimal> {
    const result = await this.prisma.inventoryClaim.aggregate({
      where: { offeringId: pieceOfferingId, status: InventoryClaimStatus.PENDING },
      _sum: { quantityInPieceUom: true },
    });

    return result._sum.quantityInPieceUom ?? zero;
  }
}
