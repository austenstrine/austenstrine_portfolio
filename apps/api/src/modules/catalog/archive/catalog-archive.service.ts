import {
	BadRequestException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleDestroy,
	OnModuleInit,
} from '@nestjs/common';
import { InventoryClaimStatus, type Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MailService } from '../../../infra/mail/mail.service';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { CatalogActor } from '../catalog-actor';
import { VendorAccessService } from '../vendor-access.service';

const productDeleteInclude = {
	vendor: true,
	category: true,
	attributeValues: {
		include: {
			attributeValue: {
				include: { attribute: true },
			},
		},
	},
	offerings: {
		include: {
			uom: true,
			containmentsAsParent: {
				include: {
					childOffering: true,
				},
			},
			containmentsAsChild: {
				include: {
					parentOffering: true,
				},
			},
			brokenPacks: true,
			claims: {
				where: { status: InventoryClaimStatus.PENDING },
				select: { id: true },
			},
		},
	},
} satisfies Prisma.CatalogProductInclude;

type ProductForDelete = Prisma.CatalogProductGetPayload<{
	include: typeof productDeleteInclude;
}>;

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 183;
const PRUNE_INTERVAL_MS = 1000 * 60 * 60 * 12;

@Injectable()
export class CatalogArchiveService implements OnModuleInit, OnModuleDestroy {
	private readonly logger = new Logger(CatalogArchiveService.name);
	private pruneTimer: NodeJS.Timeout | null = null;

	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
		private readonly mail: MailService,
	) {}

	onModuleInit() {
		void this.pruneExpiredArchives().catch((error) => {
			this.logger.error('Initial archive prune failed', error as Error);
		});
		this.pruneTimer = setInterval(() => {
			void this.pruneExpiredArchives().catch((error) => {
				this.logger.error('Scheduled archive prune failed', error as Error);
			});
		}, PRUNE_INTERVAL_MS);
		this.pruneTimer.unref?.();
	}

	onModuleDestroy() {
		if(this.pruneTimer) {
			clearInterval(this.pruneTimer);
			this.pruneTimer = null;
		}
	}

	async deleteProductById(actor: CatalogActor, productId: string) {
		const product = await this.prisma.catalogProduct.findUnique({
			where: { id: productId },
			include: productDeleteInclude,
		});

		if(!product) {
			throw new NotFoundException('Product not found.');
		}

		await this.vendorAccess.assertActorCanEditVendor(actor, product.vendorId);
		return this.deleteProducts(actor, product.vendorId, [product]);
	}

	async deleteProductsForVendor(
		actor: CatalogActor,
		vendorId: string,
		input: { productIds?: string[]; productSlugs?: string[] },
	) {
		await this.vendorAccess.assertActorCanEditVendor(actor, vendorId);

		const ids = new Set(input.productIds ?? []);
		const slugs = new Set(
			(input.productSlugs ?? []).map((row) => row.trim()).filter(Boolean),
		);

		if(ids.size === 0 && slugs.size === 0) {
			throw new BadRequestException('Provide productIds and/or productSlugs.');
		}

		const products = await this.prisma.catalogProduct.findMany({
			where: {
				vendorId,
				OR: [
					ids.size > 0 ? { id: { in: [...ids] } } : undefined,
					slugs.size > 0 ? { slug: { in: [...slugs] } } : undefined,
				].filter(Boolean) as Prisma.CatalogProductWhereInput[],
			},
			include: productDeleteInclude,
		});

		if(products.length === 0) {
			throw new NotFoundException('No matching products found for this vendor.');
		}

		return this.deleteProducts(actor, vendorId, products);
	}

	async pruneExpiredArchives() {
		const cutoff = new Date(Date.now() - SIX_MONTHS_MS);
		const [products, attributes, offerings, containments, broken] =
			await this.prisma.$transaction([
				this.prisma.archivedCatalogProduct.deleteMany({
					where: { archivedAt: { lt: cutoff } },
				}),
				this.prisma.archivedProductAttribute.deleteMany({
					where: { archivedAt: { lt: cutoff } },
				}),
				this.prisma.archivedProductOffering.deleteMany({
					where: { archivedAt: { lt: cutoff } },
				}),
				this.prisma.archivedOfferingContainment.deleteMany({
					where: { archivedAt: { lt: cutoff } },
				}),
				this.prisma.archivedBrokenPack.deleteMany({
					where: { archivedAt: { lt: cutoff } },
				}),
			]);

		const total =
			products.count +
			attributes.count +
			offerings.count +
			containments.count +
			broken.count;

		if(total > 0) {
			this.logger.log(
				`Pruned ${total} archived catalog rows older than ${cutoff.toISOString()}`,
			);
		}

		return {
			cutoff,
			deleted: {
				products: products.count,
				attributes: attributes.count,
				offerings: offerings.count,
				containments: containments.count,
				brokenPacks: broken.count,
			},
		};
	}

	private async deleteProducts(
		actor: CatalogActor,
		vendorId: string,
		products: ProductForDelete[],
	) {
		for(const product of products) {
			const pending = product.offerings.reduce(
				(sum, offering) => sum + offering.claims.length,
				0,
			);
			if(pending > 0) {
				throw new BadRequestException(
					`Cannot delete "${product.title}" while pending inventory claims exist.`,
				);
			}
		}

		const archiveBatchId = randomUUID();
		const csv = this.buildDeletionCsv(products);
		const ownerEmails = await this.ownerEmails(vendorId);

		await this.prisma.$transaction(async (tx) => {
			for(const product of products) {
				await tx.archivedCatalogProduct.create({
					data: {
						archiveBatchId,
						originalId: product.id,
						vendorId: product.vendorId,
						vendorSlug: product.vendor.slug,
						categoryId: product.categoryId,
						categorySlug: product.category?.slug ?? null,
						slug: product.slug,
						title: product.title,
						description: product.description,
						active: product.active,
						inventoryFromAllocations: product.inventoryFromAllocations,
						breakFeeMode: product.breakFeeMode,
						breakFeeCents: product.breakFeeCents,
						originalCreatedAt: product.createdAt,
						originalUpdatedAt: product.updatedAt,
					},
				});

				if(product.attributeValues.length > 0) {
					await tx.archivedProductAttribute.createMany({
						data: product.attributeValues.map((row) => ({
							archiveBatchId,
							originalId: row.attributeValue.id,
							originalProductId: product.id,
							key: row.attributeValue.attribute.name,
							value: row.attributeValue.value,
							sortOrder: row.sortOrder,
						})),
					});
				}

				for(const offering of product.offerings) {
					await tx.archivedProductOffering.create({
						data: {
							archiveBatchId,
							originalId: offering.id,
							originalProductId: product.id,
							vendorId: offering.vendorId,
							sku: offering.sku,
							offeringKey: offering.offeringKey,
							uomId: offering.uomId,
							uomCode: offering.uom.code,
							role: offering.role,
							priceCents: offering.priceCents,
							currency: offering.currency,
							qtyOnHand: offering.qtyOnHand,
							availableQty: offering.availableQty,
							tracksOwnQty: offering.tracksOwnQty,
							minUnbrokenQty: offering.minUnbrokenQty,
							breakPoolAboveQty: offering.breakPoolAboveQty,
							inheritQtyToChildren: offering.inheritQtyToChildren,
							originalCreatedAt: offering.createdAt,
							originalUpdatedAt: offering.updatedAt,
						},
					});

					const containmentRows = [
						...offering.containmentsAsParent.map((link) => ({
							archiveBatchId,
							originalId: link.id,
							originalParentOfferingId: link.parentOfferingId,
							originalChildOfferingId: link.childOfferingId,
							parentSku: offering.sku,
							parentOfferingKey: offering.offeringKey,
							childSku: link.childOffering.sku,
							childOfferingKey: link.childOffering.offeringKey,
							childQtyPerParent: link.childQtyPerParent,
							breakFeeCents: link.breakFeeCents,
							originalCreatedAt: link.createdAt,
						})),
						...offering.containmentsAsChild.map((link) => ({
							archiveBatchId,
							originalId: link.id,
							originalParentOfferingId: link.parentOfferingId,
							originalChildOfferingId: link.childOfferingId,
							parentSku: link.parentOffering.sku,
							parentOfferingKey: link.parentOffering.offeringKey,
							childSku: offering.sku,
							childOfferingKey: offering.offeringKey,
							childQtyPerParent: link.childQtyPerParent,
							breakFeeCents: link.breakFeeCents,
							originalCreatedAt: link.createdAt,
						})),
					];
					const seenContainment = new Set<string>();
					const uniqueContainments = containmentRows.filter((row) => {
						if(seenContainment.has(row.originalId)) {
							return false;
						}
						seenContainment.add(row.originalId);
						return true;
					});
					if(uniqueContainments.length > 0) {
						await tx.archivedOfferingContainment.createMany({
							data: uniqueContainments,
						});
					}

					if(offering.brokenPacks.length > 0) {
						await tx.archivedBrokenPack.createMany({
							data: offering.brokenPacks.map((broken) => ({
								archiveBatchId,
								originalId: broken.id,
								originalPackOfferingId: broken.packOfferingId,
								packSku: offering.sku,
								packOfferingKey: offering.offeringKey,
								label: broken.label,
								remainingQty: broken.remainingQty,
								status: broken.status,
								originalCreatedAt: broken.createdAt,
								originalUpdatedAt: broken.updatedAt,
							})),
						});
					}
				}

				// Drop non-pending claims + broken packs via cascade with product
				await tx.inventoryClaim.deleteMany({
					where: {
						offeringId: { in: product.offerings.map((row) => row.id) },
					},
				});
				await tx.brokenPack.deleteMany({
					where: {
						packOfferingId: { in: product.offerings.map((row) => row.id) },
					},
				});
				await tx.catalogProduct.delete({ where: { id: product.id } });
			}
		});

		if(ownerEmails.length > 0) {
			const slugList = products.map((row) => row.slug).join(', ');
			try {
				await this.mail.sendMailWithAttachment({
					to: ownerEmails,
					subject: `Catalog deletion receipt · ${products[0].vendor.name}`,
					text:
						`${products.length} product(s) were deleted from ${products[0].vendor.name}.\n` +
						`Batch: ${archiveBatchId}\n` +
						`Slugs: ${slugList}\n\n` +
						`A CSV of the deleted offerings is attached. Archived copies are kept for 6 months.`,
					html:
						`<p><strong>${products.length}</strong> product(s) were deleted from ` +
						`<strong>${products[0].vendor.name}</strong>.</p>` +
						`<p>Batch: <code>${archiveBatchId}</code></p>` +
						`<p>Slugs: ${slugList}</p>` +
						`<p>A CSV of the deleted offerings is attached. Archived copies are kept for 6 months.</p>`,
					attachments: [
						{
							filename: `catalog-deleted-${archiveBatchId.slice(0, 8)}.csv`,
							content: csv,
							contentType: 'text/csv; charset=utf-8',
						},
					],
				});
			}
			catch(error) {
				this.logger.error(
					`Deleted products but failed to email owners for batch ${archiveBatchId}`,
					error as Error,
				);
			}
		}
		else {
			this.logger.warn(
				`No OWNER emails for vendor ${vendorId}; deletion CSV was not emailed (batch ${archiveBatchId}).`,
			);
		}

		return {
			archiveBatchId,
			deletedCount: products.length,
			productSlugs: products.map((row) => row.slug),
			emailedTo: ownerEmails,
			csvAttached: ownerEmails.length > 0,
		};
	}

	private async ownerEmails(vendorId: string): Promise<string[]> {
		const owners = await this.prisma.vendorMember.findMany({
			where: { vendorId, role: 'OWNER' },
			include: { user: { select: { email: true } } },
		});
		return [...new Set(owners.map((row) => row.user.email).filter(Boolean))];
	}

	private buildDeletionCsv(products: ProductForDelete[]): string {
		const baseHeaders = [
			'product_slug',
			'title',
			'description',
			'category_slug',
			'active',
			'sku',
			'offering_key',
			'uom_code',
			'role',
			'price',
			'currency',
			'qty_on_hand',
			'tracks_own_qty',
			'min_unbroken_qty',
			'break_pool_above_qty',
			'inherit_qty_to_children',
			'parent_offering_key',
			'child_qty_per_parent',
			'break_fee_mode',
			'break_fee_cents',
		];

		const attrKeys = [
			...new Set(
				products.flatMap((product) =>
					product.attributeValues.map(
						(row) => row.attributeValue.attribute.name,
					),
				),
			),
		];
		const headers = [
			...baseHeaders,
			...attrKeys.map((key) => `attr.${key}`),
		];
		const lines = [headers.join(',')];

		for(const product of products) {
			const parentByChildId = new Map<
				string,
				{ parentKey: string; qty: string }
			>();
			for(const offering of product.offerings) {
				for(const link of offering.containmentsAsParent) {
					parentByChildId.set(link.childOfferingId, {
						parentKey: offering.offeringKey,
						qty: link.childQtyPerParent.toString(),
					});
				}
			}

			const attrMap = new Map(
				product.attributeValues.map((row) => [
					row.attributeValue.attribute.name,
					row.attributeValue.value,
				]),
			);

			for(const offering of product.offerings) {
				const parent = parentByChildId.get(offering.id);
				const base: Record<string, string> = {
					product_slug: product.slug,
					title: product.title,
					description: product.description ?? '',
					category_slug: product.category?.slug ?? '',
					active: String(product.active),
					sku: offering.sku,
					offering_key: offering.offeringKey,
					uom_code: offering.uom.code,
					role: offering.role,
					price: (offering.priceCents / 100).toFixed(2),
					currency: offering.currency,
					qty_on_hand: offering.qtyOnHand.toString(),
					tracks_own_qty: String(offering.tracksOwnQty),
					min_unbroken_qty: offering.minUnbrokenQty.toString(),
					break_pool_above_qty: offering.breakPoolAboveQty.toString(),
					inherit_qty_to_children: String(offering.inheritQtyToChildren),
					parent_offering_key: parent?.parentKey ?? '',
					child_qty_per_parent: parent?.qty ?? '',
					break_fee_mode: product.breakFeeMode,
					break_fee_cents: String(product.breakFeeCents),
				};

				for(const key of attrKeys) {
					base[`attr.${key}`] = attrMap.get(key) ?? '';
				}

				lines.push(
					headers.map((header) => csvEscape(base[header] ?? '')).join(','),
				);
			}
		}

		return `${lines.join('\n')}\n`;
	}
}

function csvEscape(value: string): string {
	if(/[",\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}
