import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
	BrokenPackStatus,
	InventoryClaimStatus,
	MarketplaceOrderStatus,
	Prisma,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { quoteBreakFeeCents, type BreakOpenEvent } from './break-fee-quote';
import {
	autoBreakAllowed,
	computeEligibleWholeUnits,
	type ParentBreakRules,
} from './inventory-break-rules';
import {
	allocateFromSupplies,
	computeMaxSingleUnitQty,
	sumDecimals,
	type SupplyUnit,
	type TrimStrategy,
} from './inventory-math';

const zero = new Decimal(0);
const MAX_CONTAINMENT_DEPTH = 16;

const offeringAvailabilityInclude = {
	product: { select: { breakFeeMode: true, breakFeeCents: true } },
	containmentsAsChild: {
		include: {
			parentOffering: {
				include: {
					brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
					containmentsAsChild: {
						include: {
							parentOffering: {
								include: {
									brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
								},
							},
						},
					},
				},
			},
		},
	},
	brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
	containmentsAsParent: true,
} satisfies Prisma.ProductOfferingInclude;

type OfferingForAvailability = Prisma.ProductOfferingGetPayload<{
	include: typeof offeringAvailabilityInclude;
}>;

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
		const offering = await this.loadOfferingForAvailability(offeringId);

		if(!offering) {
			throw new NotFoundException('Offering not found.');
		}

		const snapshot = await this.computeAvailability(offering);
		await this.prisma.productOffering.update({
			where: { id: offeringId },
			data: { availableQty: snapshot.availableQty },
		});

		return {
			offeringId,
			availableQty: snapshot.availableQty.toString(),
			maxSingleUnitQty: snapshot.maxSingleUnitQty?.toString() ?? null,
			unclaimedWholePacks: snapshot.unclaimedWholePacks.toString(),
			activeBrokenPackCount: snapshot.activeBrokenPackCount,
		};
	}

	async refreshProductAvailability(productId: string): Promise<void> {
		const offeringIds = await this.collectConnectedOfferingIds(productId);
		for(const id of offeringIds) {
			await this.refreshOfferingAvailability(id);
		}
	}

	async trimPieceQuantity(input: {
		pieceOfferingId: string;
		quantityInPieceUom: Decimal;
		strategy?: TrimStrategy;
		leewayAbs?: Decimal;
		leewayRatio?: Decimal;
		dryRun?: boolean;
	}): Promise<{
		allocations: Array<{ brokenPackId?: string; wholePackTaken: boolean; takeInPieceUom: string }>;
		breakFeeCents: number;
	}> {
		const link = await this.prisma.offeringContainment.findFirst({
			where: { childOfferingId: input.pieceOfferingId },
			include: {
				parentOffering: {
					include: {
						product: true,
						brokenPacks: { where: { status: BrokenPackStatus.ACTIVE } },
					},
				},
				childOffering: { include: { product: true } },
			},
		});

		if(!link) {
			throw new BadRequestException('This offering is not linked to a parent pack offering.');
		}

		if(!autoBreakAllowed({ minUnbrokenQty: link.parentOffering.minUnbrokenQty })) {
			throw new BadRequestException(
				'Auto-break is disabled for this parent. Open packs manually or adjust min unbroken qty.',
			);
		}

		const claimedWhole = await this.sumPendingClaims(link.parentOfferingId);
		const unclaimedWhole = Decimal.max(link.parentOffering.qtyOnHand.sub(claimedWhole), zero);
		const eligibleWhole = computeEligibleWholeUnits(unclaimedWhole, {
			minUnbrokenQty: link.parentOffering.minUnbrokenQty,
			breakPoolAboveQty: link.parentOffering.breakPoolAboveQty,
			inheritQtyToChildren: link.parentOffering.inheritQtyToChildren,
		});

		const supplies = this.buildSupplies(
			link.parentOffering,
			link.childQtyPerParent,
			eligibleWhole,
		);
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

		const wholeOpens = allocations.filter((row) => row.kind === 'whole').length;
		const feePerOpen =
			link.breakFeeCents ?? link.parentOffering.product.breakFeeCents ?? 0;
		const opens: BreakOpenEvent[] = Array.from({ length: wholeOpens }, () => ({
			parentOfferingId: link.parentOfferingId,
			containmentId: link.id,
			feeCents: feePerOpen,
		}));
		const breakFeeCents = quoteBreakFeeCents(
			link.parentOffering.product.breakFeeMode,
			link.parentOffering.product.breakFeeCents,
			opens,
		);

		if(input.dryRun) {
			return {
				allocations: allocations.map((row) => ({
					brokenPackId: row.kind === 'broken' ? row.supplyId : undefined,
					wholePackTaken: row.kind === 'whole',
					takeInPieceUom: row.takeInPieceUom.toString(),
				})),
				breakFeeCents,
			};
		}

		await this.applyTrimAllocations(
			link.parentOfferingId,
			link.childQtyPerParent,
			allocations,
		);
		await this.refreshProductAvailability(link.childOffering.productId);
		await this.refreshProductAvailability(link.parentOffering.productId);

		return {
			allocations: allocations.map((row) => ({
				brokenPackId: row.kind === 'broken' ? row.supplyId : undefined,
				wholePackTaken: row.kind === 'whole',
				takeInPieceUom: row.takeInPieceUom.toString(),
			})),
			breakFeeCents,
		};
	}

	async createClaim(input: {
		orderRef: string;
		offeringId: string;
		quantity: Decimal;
		brokenPackId?: string;
		buyerId?: string;
		orderId?: string;
	}) {
		const offering = await this.prisma.productOffering.findUnique({
			where: { id: input.offeringId },
			include: { containmentsAsChild: true },
		});

		if(!offering) {
			throw new NotFoundException('Offering not found.');
		}

		let quantityInPieceUom: Decimal | null = null;
		if(offering.containmentsAsChild[0]) {
			quantityInPieceUom = input.quantity;
		}

		const order = input.orderId
			? await this.prisma.marketplaceOrder.findUniqueOrThrow({
					where: { id: input.orderId },
				})
			: await this.prisma.marketplaceOrder.upsert({
					where: { orderRef: input.orderRef },
					create: {
						orderRef: input.orderRef,
						buyerId: input.buyerId,
						status: MarketplaceOrderStatus.HOLD,
					},
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

		await this.refreshOfferingProduct(input.offeringId);
		return claim;
	}

	async releaseClaimsForOrder(orderId: string) {
		const claims = await this.prisma.inventoryClaim.findMany({
			where: { orderId, status: InventoryClaimStatus.PENDING },
		});

		if(claims.length === 0) {
			return { released: 0 };
		}

		await this.prisma.inventoryClaim.updateMany({
			where: {
				id: { in: claims.map((row) => row.id) },
				status: InventoryClaimStatus.PENDING,
			},
			data: { status: InventoryClaimStatus.RELEASED },
		});

		const offeringIds = [...new Set(claims.map((row) => row.offeringId))];
		for(const offeringId of offeringIds) {
			await this.refreshOfferingProduct(offeringId);
		}

		return { released: claims.length };
	}

	async fulfillClaimsForOrder(orderId: string) {
		const claims = await this.prisma.inventoryClaim.findMany({
			where: {
				orderId,
				status: { in: [InventoryClaimStatus.PENDING, InventoryClaimStatus.FULFILLED] },
			},
		});

		const pending = claims.filter((row) => row.status === InventoryClaimStatus.PENDING);
		for(const claim of pending) {
			await this.prisma.$transaction(async (tx) => {
				await tx.inventoryClaim.update({
					where: { id: claim.id },
					data: { status: InventoryClaimStatus.FULFILLED },
				});

				const offering = await tx.productOffering.findUnique({
					where: { id: claim.offeringId },
				});
				if(offering?.tracksOwnQty) {
					const next = offering.qtyOnHand.sub(claim.quantity);
					await tx.productOffering.update({
						where: { id: offering.id },
						data: {
							qtyOnHand: next.lt(0) ? zero : next,
						},
					});
				}
			});
			await this.refreshOfferingProduct(claim.offeringId);
		}

		return { fulfilled: pending.length };
	}

	/** Restock fulfilled claims and release any still-pending holds for a refunded order. */
	async restockClaimsForOrder(orderId: string) {
		const claims = await this.prisma.inventoryClaim.findMany({
			where: {
				orderId,
				status: {
					in: [InventoryClaimStatus.PENDING, InventoryClaimStatus.FULFILLED],
				},
			},
		});

		let restocked = 0;
		let released = 0;

		for(const claim of claims) {
			if(claim.status === InventoryClaimStatus.PENDING) {
				await this.prisma.inventoryClaim.update({
					where: { id: claim.id },
					data: { status: InventoryClaimStatus.RELEASED },
				});
				released += 1;
			}
			else if(claim.status === InventoryClaimStatus.FULFILLED) {
				await this.prisma.$transaction(async (tx) => {
					await tx.inventoryClaim.update({
						where: { id: claim.id },
						data: { status: InventoryClaimStatus.RELEASED },
					});

					const offering = await tx.productOffering.findUnique({
						where: { id: claim.offeringId },
					});
					if(offering?.tracksOwnQty) {
						await tx.productOffering.update({
							where: { id: offering.id },
							data: {
								qtyOnHand: offering.qtyOnHand.add(claim.quantity),
							},
						});
					}
				});
				restocked += 1;
			}

			await this.refreshOfferingProduct(claim.offeringId);
		}

		return { restocked, released };
	}

	private async refreshOfferingProduct(offeringId: string) {
		const product = await this.prisma.catalogProduct.findFirst({
			where: { offerings: { some: { id: offeringId } } },
			select: { id: true },
		});
		if(product) {
			await this.refreshProductAvailability(product.id);
		}
	}

	private async loadOfferingForAvailability(
		offeringId: string,
	): Promise<OfferingForAvailability | null> {
		return this.prisma.productOffering.findUnique({
			where: { id: offeringId },
			include: offeringAvailabilityInclude,
		});
	}

	private async collectConnectedOfferingIds(productId: string): Promise<string[]> {
		const productOfferings = await this.prisma.productOffering.findMany({
			where: { productId },
			select: { id: true },
		});
		const ids = new Set(productOfferings.map((row) => row.id));
		const queue = [...ids];

		while(queue.length > 0) {
			const current = queue.pop();
			if(!current) {
				continue;
			}

			const links = await this.prisma.offeringContainment.findMany({
				where: {
					OR: [{ parentOfferingId: current }, { childOfferingId: current }],
				},
				select: { parentOfferingId: true, childOfferingId: true },
			});

			for(const link of links) {
				for(const nextId of [link.parentOfferingId, link.childOfferingId]) {
					if(!ids.has(nextId)) {
						ids.add(nextId);
						queue.push(nextId);
					}
				}
			}
		}

		return [...ids];
	}

	private async computeAvailability(offering: OfferingForAvailability) {
		const claimedOnSelf = await this.sumPendingClaims(offering.id);
		let available = offering.tracksOwnQty
			? Decimal.max(offering.qtyOnHand.sub(claimedOnSelf), zero)
			: zero;

		let activeBrokenPackCount = 0;
		const brokenRemainders: Decimal[] = [];

		for(const link of offering.containmentsAsChild) {
			const broken = link.parentOffering.brokenPacks.filter(
				(row) => row.status === BrokenPackStatus.ACTIVE && row.remainingQty.gt(0),
			);
			activeBrokenPackCount += broken.length;
			for(const row of broken) {
				brokenRemainders.push(row.remainingQty);
			}
			available = available.add(sumDecimals(broken.map((row) => row.remainingQty)));
		}

		for(const link of offering.containmentsAsChild) {
			if(!link.parentOffering.inheritQtyToChildren) {
				continue;
			}

			const extendedWhole = await this.computeExtendedUnclaimedWhole(
				link.parentOfferingId,
				new Set([offering.id]),
				0,
			);
			const eligible = computeEligibleWholeUnits(extendedWhole, {
				minUnbrokenQty: link.parentOffering.minUnbrokenQty,
				breakPoolAboveQty: link.parentOffering.breakPoolAboveQty,
				inheritQtyToChildren: link.parentOffering.inheritQtyToChildren,
			});
			available = available.add(eligible.mul(link.childQtyPerParent));
		}

		const claimedPiece = await this.sumPendingPieceClaims(offering.id);
		available = Decimal.max(available.sub(claimedPiece), zero);

		const primaryParent = offering.containmentsAsChild[0];
		let unclaimedWholePacks = zero;
		let maxSingleUnitQty: Decimal | null = null;

		if(primaryParent) {
			const claimedWhole = await this.sumPendingClaims(primaryParent.parentOfferingId);
			unclaimedWholePacks = Decimal.max(
				primaryParent.parentOffering.qtyOnHand.sub(claimedWhole),
				zero,
			);
			maxSingleUnitQty = computeMaxSingleUnitQty(
				unclaimedWholePacks,
				primaryParent.childQtyPerParent,
				brokenRemainders,
			);
		}
		else if(offering.tracksOwnQty) {
			unclaimedWholePacks = Decimal.max(offering.qtyOnHand.sub(claimedOnSelf), zero);
		}

		return {
			availableQty: available,
			maxSingleUnitQty,
			unclaimedWholePacks,
			activeBrokenPackCount,
		};
	}

	private async computeExtendedUnclaimedWhole(
		offeringId: string,
		visited: Set<string>,
		depth: number,
	): Promise<Decimal> {
		if(depth > MAX_CONTAINMENT_DEPTH || visited.has(offeringId)) {
			return zero;
		}

		visited.add(offeringId);

		const offering = await this.prisma.productOffering.findUnique({
			where: { id: offeringId },
			include: {
				containmentsAsChild: {
					select: {
						parentOfferingId: true,
						childQtyPerParent: true,
						parentOffering: {
							select: {
								inheritQtyToChildren: true,
								minUnbrokenQty: true,
								breakPoolAboveQty: true,
							},
						},
					},
				},
			},
		});

		if(!offering) {
			return zero;
		}

		const claimedWhole = await this.sumPendingClaims(offering.id);
		let total = Decimal.max(offering.qtyOnHand.sub(claimedWhole), zero);

		for(const link of offering.containmentsAsChild) {
			if(!link.parentOffering.inheritQtyToChildren) {
				continue;
			}

			const grandParentWhole = await this.computeExtendedUnclaimedWhole(
				link.parentOfferingId,
				visited,
				depth + 1,
			);
			const eligible = computeEligibleWholeUnits(grandParentWhole, {
				minUnbrokenQty: link.parentOffering.minUnbrokenQty,
				breakPoolAboveQty: link.parentOffering.breakPoolAboveQty,
				inheritQtyToChildren: link.parentOffering.inheritQtyToChildren,
			});
			total = total.add(eligible.mul(link.childQtyPerParent));
		}

		return total;
	}

	private buildSupplies(
		parentOffering: Prisma.ProductOfferingGetPayload<{ include: { brokenPacks: true } }>,
		childQtyPerParent: Decimal,
		eligibleWhole: Decimal,
	): SupplyUnit[] {
		const supplies: SupplyUnit[] = [];

		if(eligibleWhole.gt(0)) {
			supplies.push({
				id: parentOffering.id,
				kind: 'whole',
				remainingInPieceUom: eligibleWhole.mul(childQtyPerParent),
			});
		}

		for(const broken of parentOffering.brokenPacks) {
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
		parentOfferingId: string,
		childQtyPerParent: Decimal,
		allocations: Array<{ supplyId: string; kind: 'whole' | 'broken'; takeInPieceUom: Decimal }>,
	): Promise<void> {
		for(const allocation of allocations) {
			if(allocation.kind === 'whole') {
				const take = allocation.takeInPieceUom;
				const fullParents = take.div(childQtyPerParent).floor();
				const partial = take.mod(childQtyPerParent);
				const parentsToConsume = partial.gt(0) ? fullParents.add(1) : fullParents;

				if(parentsToConsume.gt(0)) {
					await this.prisma.productOffering.update({
						where: { id: parentOfferingId },
						data: { qtyOnHand: { decrement: parentsToConsume } },
					});
				}

				if(partial.gt(0)) {
					const openedRemainder = childQtyPerParent.sub(partial);
					if(openedRemainder.gt(0)) {
						await this.prisma.brokenPack.create({
							data: {
								packOfferingId: parentOfferingId,
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
