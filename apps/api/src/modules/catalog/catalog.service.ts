import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductOfferingRole } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { MailService } from '../../infra/mail/mail.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AttributeService } from './attributes/attribute.service';
import { measuresToPrisma, serializeMeasures } from './attributes/product-measures';
import { InventoryService } from './inventory/inventory.service';
import { CatalogSearchService } from './search/catalog-search.service';
import { VendorAccessService } from './vendor-access.service';
import { CreateBrokenPackDto } from './dto/create-broken-pack.dto';
import { CreateCatalogProductDto } from './dto/create-catalog-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateUomDto } from './dto/create-uom.dto';
import { RequestCategoryDto } from './dto/request-category.dto';
import { TrimInventoryDto } from './dto/trim-inventory.dto';
import { UpdateCatalogCategoryDto } from './dto/upload-catalog-media.dto';
import { UpdateCatalogProductDto } from './dto/update-catalog-product.dto';
import { UomMergeService } from './uom-merge.service';
import { resolveQty } from './uom-qty';
import type { QtyCompoundDto } from './dto/qty-compound.dto';
import { isUuidLike } from './vendor-link-name';

const productInclude = {
	vendor: true,
	category: true,
	attributeValues: {
		orderBy: { sortOrder: 'asc' as const },
		include: {
			attributeValue: {
				include: { attribute: true, parent: true },
			},
		},
	},
	scalarValues: {
		include: { attribute: true },
	},
	offerings: {
		include: {
			uom: true,
			containmentsAsParent: {
				include: { childOffering: { include: { uom: true } } },
			},
			containmentsAsChild: {
				include: { parentOffering: { include: { uom: true } } },
			},
		},
	},
} satisfies Prisma.CatalogProductInclude;

@Injectable()
export class CatalogService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly inventory: InventoryService,
		private readonly vendorAccess: VendorAccessService,
		private readonly mail: MailService,
		private readonly uomMerges: UomMergeService,
		private readonly attributes: AttributeService,
		private readonly catalogSearch: CatalogSearchService,
	) {}

	listUoms(vendorId?: string) {
		return this.prisma.unitOfMeasure.findMany({
			where: vendorId
				? {
						OR: [
							{ vendorId: null },
							{ vendorId },
						],
					}
				: undefined,
			orderBy: [{ vendorId: 'asc' }, { code: 'asc' }],
			include: {
				vendor: { select: { id: true, name: true, slug: true } },
			},
		});
	}

	async createUom(userId: string, dto: CreateUomDto) {
		const code = dto.code.trim();
		if(!code) {
			throw new BadRequestException('UOM code is required.');
		}

		const aliases = this.uomMerges.normalizeAliases(dto.aliases);
		const dimensionKey = dto.dimensionKey.trim().toLowerCase();
		const label = dto.label.trim();

		let vendorId: string | null = dto.vendorId ?? null;

		if(vendorId) {
			await this.vendorAccess.assertCanEditVendor(userId, vendorId);
		}
		else {
			await this.vendorAccess.assertIsSuperVendorMember(userId);
		}

		const existing = await this.prisma.unitOfMeasure.findFirst({
			where: vendorId
				? { vendorId, code }
				: { vendorId: null, code },
		});
		if(existing) {
			throw new ConflictException(
				vendorId
					? 'Your vendor already has a UOM with that name.'
					: 'A global UOM with that name already exists.',
			);
		}

		const created = await this.prisma.unitOfMeasure.create({
			data: {
				code,
				label,
				vendorId,
				aliases,
				dimensionKey,
				factorToReference: new Decimal(dto.factorToReference),
				omitFromAvailability: dto.omitFromAvailability === true,
				metadata: dto.metadata as Prisma.InputJsonValue | undefined,
			},
			include: {
				vendor: { select: { id: true, name: true, slug: true } },
			},
		});

		if(vendorId) {
			await this.uomMerges.evaluateAfterVendorUomChange(created.id).catch(() => undefined);
		}

		return created;
	}

	listCategories() {
		return this.prisma.catalogCategory.findMany({
			orderBy: { name: 'asc' },
			include: {
				parent: { select: { id: true, name: true, slug: true } },
				_count: { select: { products: true, children: true } },
			},
		});
	}

	async createCategory(userId: string, dto: CreateCategoryDto) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);

		const slug = dto.slug.trim().toLowerCase();
		const name = dto.name.trim();

		const existing = await this.prisma.catalogCategory.findUnique({ where: { slug } });
		if(existing) {
			throw new ConflictException('A category with that slug already exists.');
		}

		if(dto.parentId) {
			const parent = await this.prisma.catalogCategory.findUnique({
				where: { id: dto.parentId },
			});
			if(!parent) {
				throw new NotFoundException('Parent category not found.');
			}
		}

		return this.prisma.catalogCategory.create({
			data: {
				name,
				slug,
				parentId: dto.parentId,
				imageUrl: this.normalizeImageUrl(dto.imageUrl),
			},
			include: {
				parent: { select: { id: true, name: true, slug: true } },
				_count: { select: { products: true, children: true } },
			},
		});
	}

	async assertCanUploadMedia(
		userId: string,
		input: { productId?: string; categoryId?: string; vendorId?: string; kind?: string },
	) {
		if(input.productId) {
			await this.vendorAccess.assertCanEditProduct(userId, input.productId);
			return;
		}
		if(input.categoryId || input.kind === 'category') {
			await this.vendorAccess.assertIsSuperVendorMember(userId);
			return;
		}
		if(input.vendorId) {
			await this.vendorAccess.assertCanEditVendor(userId, input.vendorId);
			return;
		}
		throw new BadRequestException('Provide a product, category, or vendor to attach this image to.');
	}

	async attachProductImage(userId: string, productId: string, imageUrl: string) {
		await this.vendorAccess.assertCanEditProduct(userId, productId);
		const product = await this.prisma.catalogProduct.findUnique({
			where: { id: productId },
			select: { imageUrls: true },
		});
		if(!product) {
			throw new NotFoundException('Product not found.');
		}
		const imageUrls = this.normalizeImageUrls([...product.imageUrls, imageUrl]);
		await this.prisma.catalogProduct.update({
			where: { id: productId },
			data: { imageUrls },
		});
		await this.catalogSearch.indexProduct(productId);
		return imageUrls;
	}

	async updateCategory(userId: string, categoryId: string, dto: UpdateCatalogCategoryDto) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);
		const existing = await this.prisma.catalogCategory.findUnique({ where: { id: categoryId } });
		if(!existing) {
			throw new NotFoundException('Category not found.');
		}
		return this.prisma.catalogCategory.update({
			where: { id: categoryId },
			data: {
				imageUrl: dto.imageUrl === undefined ? existing.imageUrl : this.normalizeImageUrl(dto.imageUrl),
			},
			include: {
				parent: { select: { id: true, name: true, slug: true } },
				_count: { select: { products: true, children: true } },
			},
		});
	}

	async requestCategory(userId: string, userEmail: string, dto: RequestCategoryDto) {
		const memberships = await this.prisma.vendorMember.findMany({
			where: { userId },
			include: { vendor: { select: { name: true, slug: true } } },
			take: 10,
		});
		if(memberships.length === 0) {
			throw new BadRequestException('Join a vendor organization before requesting categories.');
		}

		const to = process.env.CATEGORY_REQUEST_EMAIL ?? 'categories@austenstrine.dev';
		const vendorLines = memberships
			.map((row) => `- ${row.vendor.name} (/place-et-marque/${row.vendor.slug}) as ${row.role}`)
			.join('\n');
		const text = [
			`Category request from ${userEmail}`,
			'',
			`Requested name: ${dto.name.trim()}`,
			`Suggested parent: ${dto.suggestedParent?.trim() || '(none)'}`,
			`Note: ${dto.note?.trim() || '(none)'}`,
			'',
			'Requester vendor memberships:',
			vendorLines,
		].join('\n');

		await this.mail.sendMailWithAttachment({
			to,
			subject: `Category request: ${dto.name.trim()}`,
			text,
			html: `<pre style="font-family:inherit;white-space:pre-wrap;">${text}</pre>`,
		});

		return { message: 'Category request sent. The Place et Marque team will review it.' };
	}

	async listPopularTags(input: {
		userId: string;
		vendorId?: string;
		limit?: number;
	}) {
		const limit = Math.min(Math.max(input.limit ?? 40, 1), 100);
		const where: Prisma.CatalogProductWhereInput = { active: true };
		if(input.vendorId) {
			await this.vendorAccess.assertCanEditVendor(input.userId, input.vendorId);
			where.vendorId = input.vendorId;
		}

		const products = await this.prisma.catalogProduct.findMany({
			where,
			select: { tags: true, vendorId: true },
			take: 2000,
		});

		const counts = new Map<string, number>();
		for(const product of products) {
			for(const tag of product.tags) {
				const key = tag.trim();
				if(!key) {
					continue;
				}
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
		}

		return [...counts.entries()]
			.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
			.slice(0, limit)
			.map(([tag, count]) => ({ tag, count }));
	}

	normalizeTags(tags: string[] | undefined): string[] | undefined {
		if(tags === undefined) {
			return undefined;
		}
		const seen = new Set<string>();
		const normalized: string[] = [];
		for(const raw of tags) {
			const tag = raw.trim().replace(/\s+/g, ' ');
			if(!tag || seen.has(tag)) {
				continue;
			}
			seen.add(tag);
			normalized.push(tag.slice(0, 60));
		}
		return normalized.slice(0, 40);
	}

	normalizeImageUrl(url?: string | null): string | null {
		if(url == null) {
			return null;
		}
		const trimmed = url.trim();
		if(!trimmed) {
			return null;
		}
		if(!trimmed.startsWith('/media/')) {
			throw new BadRequestException('Image paths must be CDN media URLs.');
		}
		return trimmed.slice(0, 500);
	}

	normalizeImageUrls(urls?: string[]): string[] {
		if(!urls) {
			return [];
		}
		const seen = new Set<string>();
		const normalized: string[] = [];
		for(const raw of urls) {
			const url = this.normalizeImageUrl(raw);
			if(!url || seen.has(url)) {
				continue;
			}
			seen.add(url);
			normalized.push(url);
			if(normalized.length >= 8) {
				break;
			}
		}
		return normalized;
	}

	async searchProducts(query: {
		q?: string;
		categorySlug?: string;
		vendorSlug?: string;
		limit?: number;
		offset?: number;
		sort?: string;
		inStock?: boolean;
		rollupValueIds?: string[];
		omitValueIds?: string[];
	}) {
		const result = await this.catalogSearch.search(query);
		return {
			items: result.items.map((product) => this.toSummary(product)),
			appliedFilters: result.appliedFilters,
			facets: result.facets,
			categoryFacets: result.categoryFacets,
			vendorFacets: result.vendorFacets,
			total: result.total,
			source: result.source,
		};
	}

	async getProduct(vendorSlug: string, productSlug: string, viewerUserId?: string) {
		const vendorRef = vendorSlug.trim();
		const productRef = productSlug.trim();
		if(!vendorRef || !productRef) {
			throw new NotFoundException('Product not found.');
		}

		/** UUID product segment: resolve by id (vendor segment ignored for lookup). */
		if(isUuidLike(productRef)) {
			const byId = await this.prisma.catalogProduct.findFirst({
				where: {
					id: productRef,
					active: true,
				},
				include: productInclude,
			});
			if(!byId) {
				throw new NotFoundException('Product not found.');
			}
			const canEditById = await this.vendorAccess.canEditProduct(
				viewerUserId,
				byId.id,
			);
			return {
				...this.toDetail(byId),
				permissions: { canEdit: canEditById },
			};
		}

		const product = await this.prisma.catalogProduct.findFirst({
			where: {
				slug: productRef,
				active: true,
				vendor: isUuidLike(vendorRef)
					? { id: vendorRef }
					: { slug: vendorRef },
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

		const productSlug = dto.slug.trim().toLowerCase();
		if(!productSlug) {
			throw new BadRequestException('Product URL cannot be empty.');
		}
		const slugConflict = await this.prisma.catalogProduct.findUnique({
			where: {
				vendorId_slug: {
					vendorId: dto.vendorId,
					slug: productSlug,
				},
			},
			select: { id: true },
		});
		if(slugConflict) {
			throw new ConflictException(
				'A product with that URL already exists for this vendor.',
			);
		}

		const offeringIdentities = dto.offerings.map((row, index) => ({
			sku: (row.sku || dto.sku || `${productSlug}-${index + 1}`).trim(),
			offeringKey: (row.offeringKey || row.clientKey || 'default').trim() || 'default',
		}));
		await this.assertOfferingIdentitiesUniqueForVendor(dto.vendorId, offeringIdentities);

		const tags = this.normalizeTags(dto.tags) ?? [];
		const uomById = await this.uomsById(dto.offerings.map((row) => row.uomId));
		const attributeValueIds = await this.attributes.resolveOptionValueIds(
			dto.categoryId ?? null,
			dto.attributeValueIds ?? [],
		);

		const product = await this.prisma.catalogProduct.create({
			data: {
				vendorId: dto.vendorId,
				categoryId: dto.categoryId,
				slug: productSlug,
				title: dto.title,
				description: dto.description,
				imageUrls: this.normalizeImageUrls(dto.imageUrls),
				tags,
				inventoryFromAllocations: dto.inventoryFromAllocations ?? false,
				breakFeeMode: dto.breakFeeMode,
				breakFeeCents: dto.breakFeeCents,
				...measuresToPrisma(dto),
				attributeValues: {
					create: attributeValueIds.map((attributeValueId, index) => ({
						attributeValueId,
						sortOrder: index,
					})),
				},
				offerings: {
					create: dto.offerings.map((offering, index) => ({
						vendorId: dto.vendorId,
						sku: offering.sku || dto.sku || `${productSlug}-${index + 1}`,
						offeringKey:
							(offering.offeringKey || offering.clientKey || 'default').trim() ||
							'default',
						uomId: offering.uomId,
						role: offering.role,
						priceCents: offering.priceCents,
						currency: offering.currency ?? 'USD',
						qtyOnHand: this.parseQty(
							uomById.get(offering.uomId)?.code ?? '',
							offering.qtyOnHand,
							offering.qtyCompound,
						),
						tracksOwnQty: offering.tracksOwnQty ?? true,
						minUnbrokenQty:
							offering.minUnbrokenQty !== undefined
								? new Decimal(offering.minUnbrokenQty)
								: -1,
						breakPoolAboveQty:
							offering.breakPoolAboveQty !== undefined
								? new Decimal(offering.breakPoolAboveQty)
								: 0,
						inheritQtyToChildren: offering.inheritQtyToChildren ?? false,
					})),
				},
			},
			include: productInclude,
		});

		const keyToOfferingId = this.buildOfferingKeyMap(product.offerings, dto.offerings);
		await this.createContainments(product, dto, keyToOfferingId);
		await this.applyLegacyInventoryFromAllocations(product.id, dto);
		if(dto.scalarValues) {
			await this.attributes.replaceScalarValues(product.id, dto.scalarValues);
		}
		await this.inventory.refreshProductAvailability(product.id);
		await this.catalogSearch.indexProduct(product.id);

		return this.getProductById(product.id, userId);
	}

	async updateProduct(userId: string, productId: string, dto: UpdateCatalogProductDto) {
		await this.vendorAccess.assertCanEditProduct(userId, productId);

		const tags = this.normalizeTags(dto.tags);

		const existing = await this.prisma.catalogProduct.findUnique({
			where: { id: productId },
			select: { categoryId: true, vendorId: true, slug: true },
		});
		if(!existing) {
			throw new NotFoundException('Product not found.');
		}

		const categoryId = dto.categoryId === undefined
			? existing.categoryId ?? null
			: dto.categoryId;

		let nextSlug: string | undefined;
		if(dto.slug !== undefined) {
			nextSlug = dto.slug.trim().toLowerCase();
			if(!nextSlug) {
				throw new BadRequestException('Product URL (slug) cannot be empty.');
			}
			if(nextSlug !== existing.slug) {
				const conflict = await this.prisma.catalogProduct.findUnique({
					where: {
						vendorId_slug: {
							vendorId: existing.vendorId,
							slug: nextSlug,
						},
					},
					select: { id: true },
				});
				if(conflict && conflict.id !== productId) {
					throw new ConflictException('A product with that URL already exists for this vendor.');
				}
			}
		}

		await this.prisma.catalogProduct.update({
			where: { id: productId },
			data: {
				title: dto.title,
				...(nextSlug !== undefined ? { slug: nextSlug } : {}),
				description: dto.description,
				...(dto.imageUrls !== undefined ? { imageUrls: this.normalizeImageUrls(dto.imageUrls) } : {}),
				active: dto.active,
				inventoryFromAllocations: dto.inventoryFromAllocations,
				categoryId: dto.categoryId,
				breakFeeMode: dto.breakFeeMode,
				breakFeeCents: dto.breakFeeCents,
				...measuresToPrisma(dto),
				...(tags !== undefined ? { tags } : {}),
			},
		});

		if(dto.attributeValueIds) {
			const attributeValueIds = await this.attributes.resolveOptionValueIds(
				categoryId,
				dto.attributeValueIds,
			);
			await this.prisma.productAttributeValue.deleteMany({ where: { productId } });
			if(attributeValueIds.length > 0) {
				await this.prisma.productAttributeValue.createMany({
					data: attributeValueIds.map((attributeValueId, index) => ({
						productId,
						attributeValueId,
						sortOrder: index,
					})),
				});
			}
		}

		if(dto.scalarValues) {
			await this.attributes.replaceScalarValues(productId, dto.scalarValues);
		}

		const keyToOfferingId = new Map<string, string>();
		if(dto.offerings) {
			const creates = dto.offerings.filter((row) => !row.id);
			const patches = dto.offerings.filter((row) => row.id);

			if(creates.length > 0) {
				for(const row of creates) {
					if(!row.uomId || !row.role || row.priceCents === undefined) {
						throw new BadRequestException(
							'New offerings require uomId, role, and priceCents.',
						);
					}
				}
				const createIdentities = creates.map((row, index) => ({
					sku: (row.sku || `${existing.slug}-new-${index + 1}`).trim(),
					offeringKey:
						(row.offeringKey || row.clientKey || `new-${index + 1}`).trim() ||
						`new-${index + 1}`,
				}));
				await this.assertOfferingIdentitiesUniqueForVendor(
					existing.vendorId,
					createIdentities,
				);
				const uomById = await this.uomsById(creates.map((row) => row.uomId!));

				for(let index = 0; index < creates.length; index += 1) {
					const offering = creates[index]!;
					const identity = createIdentities[index]!;
					const created = await this.prisma.productOffering.create({
						data: {
							productId,
							vendorId: existing.vendorId,
							sku: identity.sku,
							offeringKey: identity.offeringKey,
							uomId: offering.uomId!,
							role: offering.role!,
							priceCents: offering.priceCents!,
							currency: offering.currency ?? 'USD',
							qtyOnHand: this.parseQty(
								uomById.get(offering.uomId!)?.code ?? '',
								offering.qtyOnHand,
								offering.qtyCompound,
							),
							tracksOwnQty: offering.tracksOwnQty ?? true,
							minUnbrokenQty:
								offering.minUnbrokenQty !== undefined
									? new Decimal(offering.minUnbrokenQty)
									: -1,
							breakPoolAboveQty:
								offering.breakPoolAboveQty !== undefined
									? new Decimal(offering.breakPoolAboveQty)
									: 0,
							inheritQtyToChildren: offering.inheritQtyToChildren ?? false,
						},
					});
					keyToOfferingId.set(created.id, created.id);
					keyToOfferingId.set(created.offeringKey, created.id);
					keyToOfferingId.set(created.sku, created.id);
					if(offering.clientKey) {
						keyToOfferingId.set(offering.clientKey, created.id);
					}
					if(offering.offeringKey) {
						keyToOfferingId.set(offering.offeringKey, created.id);
					}
				}
			}

			for(const offering of patches) {
				const current = await this.prisma.productOffering.findUnique({
					where: { id: offering.id },
					include: { uom: true },
				});
				if(!current || current.productId !== productId) {
					throw new BadRequestException('Offering does not belong to this product.');
				}

				let uomCode = current.uom.code;
				if(offering.uomId && offering.uomId !== current.uomId) {
					const uomById = await this.uomsById([offering.uomId]);
					const nextUom = uomById.get(offering.uomId);
					if(!nextUom) {
						throw new BadRequestException('Unknown UOM for offering.');
					}
					uomCode = nextUom.code;
				}

				await this.prisma.productOffering.update({
					where: { id: offering.id },
					data: {
						sku: offering.sku,
						offeringKey: offering.offeringKey,
						...(offering.uomId !== undefined ? { uomId: offering.uomId } : {}),
						priceCents: offering.priceCents,
						qtyOnHand:
							offering.qtyOnHand !== undefined || offering.qtyCompound
								? this.parseQty(
										uomCode,
										offering.qtyOnHand,
										offering.qtyCompound,
									)
								: undefined,
						tracksOwnQty: offering.tracksOwnQty,
						minUnbrokenQty:
							offering.minUnbrokenQty !== undefined
								? new Decimal(offering.minUnbrokenQty)
								: undefined,
						breakPoolAboveQty:
							offering.breakPoolAboveQty !== undefined
								? new Decimal(offering.breakPoolAboveQty)
								: undefined,
						inheritQtyToChildren: offering.inheritQtyToChildren,
					},
				});
				keyToOfferingId.set(current.id, current.id);
				keyToOfferingId.set(current.offeringKey, current.id);
				keyToOfferingId.set(current.sku, current.id);
				if(offering.clientKey) {
					keyToOfferingId.set(offering.clientKey, current.id);
				}
				if(offering.offeringKey) {
					keyToOfferingId.set(offering.offeringKey, current.id);
				}
			}
		}

		if(dto.containments !== undefined) {
			const product = await this.prisma.catalogProduct.findUnique({
				where: { id: productId },
				include: productInclude,
			});
			if(!product) {
				throw new NotFoundException('Product not found.');
			}

			for(const offering of product.offerings) {
				keyToOfferingId.set(offering.id, offering.id);
				keyToOfferingId.set(offering.offeringKey, offering.id);
				keyToOfferingId.set(offering.sku, offering.id);
			}

			const offeringIds = product.offerings.map((row) => row.id);
			await this.prisma.offeringContainment.deleteMany({
				where: {
					OR: [
						{ parentOfferingId: { in: offeringIds } },
						{ childOfferingId: { in: offeringIds } },
					],
				},
			});

			await this.createContainments(
				product,
				{ containments: dto.containments } as CreateCatalogProductDto,
				keyToOfferingId,
			);
		}

		await this.inventory.refreshProductAvailability(productId);
		await this.catalogSearch.indexProduct(productId);

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

		await this.inventory.refreshProductAvailability(packOffering.productId);

		const link = await this.prisma.offeringContainment.findFirst({
			where: { parentOfferingId: dto.packOfferingId },
		});

		if(link) {
			const child = await this.prisma.productOffering.findUnique({
				where: { id: link.childOfferingId },
				select: { productId: true },
			});
			if(child) {
				await this.inventory.refreshProductAvailability(child.productId);
			}
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

	async getProductByProductId(productId: string, viewerUserId?: string) {
		return this.getProductById(productId, viewerUserId);
	}

	listAttributes(vendorId?: string) {
		return this.attributes.listAttributes(vendorId);
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

	private buildOfferingKeyMap(
		created: Array<{
			id: string;
			role: ProductOfferingRole;
			sku: string;
			offeringKey: string;
		}>,
		inputs: CreateCatalogProductDto['offerings'],
	): Map<string, string> {
		const map = new Map<string, string>();

		created.forEach((offering, index) => {
			const input = inputs[index];
			const key =
				input?.clientKey ??
				input?.offeringKey ??
				offering.offeringKey ??
				`${offering.role}-${index}`;
			map.set(key, offering.id);
			map.set(offering.offeringKey, offering.id);
			map.set(offering.id, offering.id);
			map.set(offering.sku, offering.id);
		});

		return map;
	}

	private resolveOfferingId(
		map: Map<string, string>,
		key?: string,
		id?: string,
	): string | null {
		if(id) {
			return id;
		}
		if(key && map.has(key)) {
			return map.get(key) ?? null;
		}
		return null;
	}

	private async createContainments(
		product: Prisma.CatalogProductGetPayload<{ include: typeof productInclude }>,
		dto: CreateCatalogProductDto,
		keyToOfferingId: Map<string, string>,
	) {
		const rows = [...(dto.containments ?? [])];

		if(dto.packPieceLink) {
			const pack = product.offerings.find((row) => row.role === ProductOfferingRole.PACK);
			const piece = product.offerings.find((row) => row.role === ProductOfferingRole.PIECE);
			if(pack && piece) {
				rows.push({
					parentOfferingId: pack.id,
					childOfferingId: piece.id,
					childQtyPerParent: dto.packPieceLink.pieceQtyPerPack,
				});
			}
		}

		const seen = new Set<string>();

		for(const row of rows) {
			const parentOfferingId = this.resolveOfferingId(
				keyToOfferingId,
				row.parentOfferingKey,
				row.parentOfferingId,
			);
			const childOfferingId = this.resolveOfferingId(
				keyToOfferingId,
				row.childOfferingKey,
				row.childOfferingId,
			);

			if(!parentOfferingId || !childOfferingId) {
				throw new BadRequestException('Containment references must resolve to parent and child offerings.');
			}

			const dedupeKey = `${parentOfferingId}:${childOfferingId}`;
			if(seen.has(dedupeKey)) {
				continue;
			}
			seen.add(dedupeKey);

			await this.assertContainmentAllowed(parentOfferingId, childOfferingId);

			const child = product.offerings.find((offering) => offering.id === childOfferingId);
			await this.prisma.offeringContainment.create({
				data: {
					parentOfferingId,
					childOfferingId,
					childQtyPerParent: this.parseQty(
						child?.uom.code ?? '',
						row.childQtyPerParent,
						row.childQtyCompound,
					),
					breakFeeCents: row.breakFeeCents,
				},
			});
		}
	}

	private async assertContainmentAllowed(parentOfferingId: string, childOfferingId: string) {
		if(parentOfferingId === childOfferingId) {
			throw new BadRequestException('An offering cannot contain itself.');
		}

		const [parent, child] = await Promise.all([
			this.prisma.productOffering.findUnique({
				where: { id: parentOfferingId },
				include: { product: true },
			}),
			this.prisma.productOffering.findUnique({
				where: { id: childOfferingId },
				include: { product: true },
			}),
		]);

		if(!parent || !child) {
			throw new NotFoundException('Parent or child offering not found.');
		}

		if(parent.product.vendorId !== child.product.vendorId) {
			throw new BadRequestException('Containment requires offerings from the same vendor.');
		}

		const existingParent = await this.prisma.offeringContainment.findFirst({
			where: { childOfferingId },
		});
		if(existingParent && existingParent.parentOfferingId !== parentOfferingId) {
			throw new BadRequestException('Each child offering may only have one parent in v1.');
		}

		if(parent.inheritQtyToChildren && parent.minUnbrokenQty.lt(-0.000001)) {
			throw new BadRequestException(
				'inheritQtyToChildren requires minUnbrokenQty >= 0 on the parent offering.',
			);
		}
	}

	private async applyLegacyInventoryFromAllocations(
		productId: string,
		dto: CreateCatalogProductDto,
	) {
		if(!dto.inventoryFromAllocations) {
			return;
		}

		const offerings = await this.prisma.productOffering.findMany({ where: { productId } });
		const piece = offerings.find((row) => row.role === ProductOfferingRole.PIECE);
		const pack = offerings.find((row) => row.role === ProductOfferingRole.PACK);

		if(piece) {
			await this.prisma.productOffering.update({
				where: { id: piece.id },
				data: { tracksOwnQty: false, qtyOnHand: 0 },
			});
		}

		if(pack) {
			await this.prisma.productOffering.update({
				where: { id: pack.id },
				data: {
					minUnbrokenQty: 0,
					breakPoolAboveQty: 0,
					inheritQtyToChildren: true,
				},
			});
		}
	}

	private async assertOfferingIdentitiesUniqueForVendor(
		vendorId: string,
		rows: Array<{ sku: string; offeringKey: string }>,
	) {
		const normalized = rows.map((row) => ({
			sku: row.sku.trim(),
			offeringKey: row.offeringKey.trim() || 'default',
		}));
		const seen = new Set<string>();
		for(const row of normalized) {
			const key = `${row.sku}::${row.offeringKey}`;
			if(seen.has(key)) {
				throw new ConflictException(
					`Duplicate offering identity in request: sku=${row.sku} offering_key=${row.offeringKey}`,
				);
			}
			seen.add(key);
		}

		for(const row of normalized) {
			const existing = await this.prisma.productOffering.findUnique({
				where: {
					vendorId_sku_offeringKey: {
						vendorId,
						sku: row.sku,
						offeringKey: row.offeringKey,
					},
				},
				select: { sku: true, offeringKey: true },
			});

			if(existing) {
				throw new ConflictException(
					`Offering already exists for this vendor: sku=${existing.sku} offering_key=${existing.offeringKey}`,
				);
			}
		}
	}

	private primarySku(
		product: Prisma.CatalogProductGetPayload<{
			include: { offerings: { include: { uom: true } } };
		}>,
	) {
		const pack = product.offerings.find((row) => row.role === ProductOfferingRole.PACK);
		return pack?.sku ?? product.offerings[0]?.sku ?? '';
	}

	private toSummary(
		product: Prisma.CatalogProductGetPayload<{
			include: { vendor: true; category: true; offerings: { include: { uom: true } } };
		}>,
	) {
		const primaryOffering = product.offerings[0];

		return {
			id: product.id,
			vendor: {
				id: product.vendor.id,
				slug: product.vendor.slug,
				name: product.vendor.name,
			},
			category: product.category
				? { slug: product.category.slug, name: product.category.name }
				: null,
			sku: this.primarySku(product),
			slug: product.slug,
			title: product.title,
			description: product.description,
			imageUrls: product.imageUrls,
			tags: product.tags,
			inventoryFromAllocations: product.inventoryFromAllocations,
			breakFeeMode: product.breakFeeMode,
			breakFeeCents: product.breakFeeCents,
			primaryPriceCents: primaryOffering?.priceCents ?? null,
			primaryUom: primaryOffering?.uom.code ?? null,
			availableQty: primaryOffering?.availableQty.toString() ?? '0',
			offerings: product.offerings.map((offering) => ({
				id: offering.id,
				sku: offering.sku,
				offeringKey: offering.offeringKey,
				role: offering.role,
				priceCents: offering.priceCents,
				uom: offering.uom.code,
				omitFromAvailability: offering.uom.omitFromAvailability,
				availableQty: offering.availableQty.toString(),
			})),
		};
	}

	private toDetail(
		product: Prisma.CatalogProductGetPayload<{ include: typeof productInclude }>,
	) {
		return {
			id: product.id,
			vendor: {
				id: product.vendor.id,
				slug: product.vendor.slug,
				name: product.vendor.name,
			},
			category: product.category
				? { slug: product.category.slug, name: product.category.name }
				: null,
			sku: this.primarySku(product),
			slug: product.slug,
			title: product.title,
			description: product.description,
			imageUrls: product.imageUrls,
			tags: product.tags,
			inventoryFromAllocations: product.inventoryFromAllocations,
			breakFeeMode: product.breakFeeMode,
			breakFeeCents: product.breakFeeCents,
			...serializeMeasures(product as unknown as Record<string, unknown>),
			attributes: product.attributeValues.map((row) => ({
				id: row.attributeValue.id,
				attributeId: row.attributeValue.attributeId,
				attributeName: row.attributeValue.attribute.name,
				value: row.attributeValue.value,
				parentValue: row.attributeValue.parent?.value ?? null,
				sortOrder: row.sortOrder,
			})),
			scalarValues: product.scalarValues.map((row) => ({
				attributeId: row.attributeId,
				attributeName: row.attribute.name,
				valueKind: row.attribute.valueKind,
				stringValue: row.stringValue,
				numericValue: row.numericValue?.toString() ?? null,
				booleanValue: row.booleanValue,
			})),
			offerings: product.offerings.map((offering) => ({
				id: offering.id,
				sku: offering.sku,
				offeringKey: offering.offeringKey,
				role: offering.role,
				priceCents: offering.priceCents,
				currency: offering.currency,
				qtyOnHand: offering.qtyOnHand.toString(),
				availableQty: offering.availableQty.toString(),
				tracksOwnQty: offering.tracksOwnQty,
				minUnbrokenQty: offering.minUnbrokenQty.toString(),
				breakPoolAboveQty: offering.breakPoolAboveQty.toString(),
				inheritQtyToChildren: offering.inheritQtyToChildren,
				uom: {
					code: offering.uom.code,
					label: offering.uom.label,
					dimensionKey: offering.uom.dimensionKey,
					omitFromAvailability: offering.uom.omitFromAvailability,
				},
				childContainments: offering.containmentsAsParent.map((link) => ({
					id: link.id,
					childOfferingId: link.childOfferingId,
					childSku: link.childOffering.sku,
					childQtyPerParent: link.childQtyPerParent.toString(),
					breakFeeCents: link.breakFeeCents,
					childUom: link.childOffering.uom.code,
				})),
				parentContainments: offering.containmentsAsChild.map((link) => ({
					id: link.id,
					parentOfferingId: link.parentOfferingId,
					parentSku: link.parentOffering.sku,
					childQtyPerParent: link.childQtyPerParent.toString(),
					breakFeeCents: link.breakFeeCents,
					parentUom: link.parentOffering.uom.code,
				})),
			})),
		};
	}

	private async uomsById(ids: string[]): Promise<Map<string, { id: string; code: string }>> {
		const unique = [...new Set(ids.filter(Boolean))];
		if(unique.length === 0) {
			return new Map();
		}
		const rows = await this.prisma.unitOfMeasure.findMany({
			where: { id: { in: unique } },
			select: { id: true, code: true },
		});
		return new Map(rows.map((row) => [row.id, row]));
	}

	private parseQty(
		uomCode: string,
		qty?: string | null,
		compound?: QtyCompoundDto | null,
	): Decimal {
		try {
			return new Decimal(resolveQty(uomCode, qty, compound));
		}
		catch(error) {
			throw new BadRequestException(
				error instanceof Error ? error.message : 'Invalid quantity.',
			);
		}
	}
}
