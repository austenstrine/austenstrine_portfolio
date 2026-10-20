import {
	BadRequestException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	BreakFeeMode,
	CatalogImportSource,
	CatalogImportStatus,
	ProductOfferingRole,
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import type { CatalogActor } from '../catalog-actor';
import { catalogActorUserId } from '../catalog-actor';
import { InventoryService } from '../inventory/inventory.service';
import { VendorAccessService } from '../vendor-access.service';
import {
	CATALOG_IMPORT_REQUIRED_HEADERS,
	CATALOG_IMPORT_TEMPLATE_CSV,
	parseDelimitedCatalog,
} from './csv-parse';

export type ImportRowError = {
	lineNumber: number;
	column?: string;
	message: string;
	blocking: boolean;
};

type ParsedOfferingRow = {
	lineNumber: number;
	productSlug: string;
	title: string;
	description?: string;
	categorySlug?: string;
	active?: boolean;
	sku: string;
	offeringKey: string;
	uomCode: string;
	role: ProductOfferingRole;
	priceCents: number;
	currency: string;
	qtyOnHand: string;
	tracksOwnQty?: boolean;
	minUnbrokenQty?: string;
	breakPoolAboveQty?: string;
	inheritQtyToChildren?: boolean;
	parentOfferingKey?: string;
	childQtyPerParent?: string;
	breakFeeMode?: BreakFeeMode;
	breakFeeCents?: number;
	attributes: Array<{ key: string; value: string }>;
	vendorSlug?: string;
};

type ValidateResult = {
	delimiter: ',' | '\t';
	rowCount: number;
	blockingErrorCount: number;
	warningCount: number;
	createProductCount: number;
	updateProductCount: number;
	createOfferingCount: number;
	updateOfferingCount: number;
	errors: ImportRowError[];
	ok: boolean;
};

@Injectable()
export class CatalogImportService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
		private readonly inventory: InventoryService,
	) {}

	getTemplateCsv() {
		return CATALOG_IMPORT_TEMPLATE_CSV;
	}

	async validate(
		actor: CatalogActor,
		vendorId: string,
		csvText: string,
	): Promise<ValidateResult> {
		await this.vendorAccess.assertActorCanEditVendor(actor, vendorId);
		const prepared = await this.prepare(vendorId, csvText);
		return prepared.preview;
	}

	async commit(
		actor: CatalogActor,
		vendorId: string,
		csvText: string,
		source: CatalogImportSource,
	) {
		await this.vendorAccess.assertActorCanEditVendor(actor, vendorId);
		const prepared = await this.prepare(vendorId, csvText);

		if(!prepared.preview.ok) {
			throw new BadRequestException({
				message: 'CSV has blocking validation errors.',
				...prepared.preview,
			});
		}

		const job = await this.prisma.catalogImportJob.create({
			data: {
				vendorId,
				createdByUserId: catalogActorUserId(actor) ?? null,
				source,
				status: CatalogImportStatus.PENDING,
				rowCount: prepared.preview.rowCount,
			},
		});

		void this.runJob(job.id, vendorId, prepared.rows).catch(async (error) => {
			await this.prisma.catalogImportJob.update({
				where: { id: job.id },
				data: {
					status: CatalogImportStatus.FAILED,
					finishedAt: new Date(),
					errorsJson: [
						{
							lineNumber: 0,
							message:
								error instanceof Error
									? error.message
									: 'Import job failed unexpectedly.',
							blocking: true,
						},
					],
					errorCount: 1,
				},
			});
		});

		return { jobId: job.id, status: job.status };
	}

	async getJob(actor: CatalogActor, vendorId: string, jobId: string) {
		await this.vendorAccess.assertActorCanEditVendor(actor, vendorId);

		const job = await this.prisma.catalogImportJob.findFirst({
			where: { id: jobId, vendorId },
		});

		if(!job) {
			throw new NotFoundException('Import job not found.');
		}

		return {
			id: job.id,
			status: job.status,
			rowCount: job.rowCount,
			createdCount: job.createdCount,
			updatedCount: job.updatedCount,
			errorCount: job.errorCount,
			errors: job.errorsJson,
			createdAt: job.createdAt,
			finishedAt: job.finishedAt,
		};
	}

	private async prepare(vendorId: string, csvText: string) {
		const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		const parsed = parseDelimitedCatalog(csvText);
		const errors: ImportRowError[] = [];

		if(parsed.headers.length === 0) {
			errors.push({
				lineNumber: 1,
				message: 'CSV is empty.',
				blocking: true,
			});
			return {
				rows: [] as ParsedOfferingRow[],
				preview: this.toPreview(parsed.delimiter, [], errors, vendorId),
			};
		}

		const hasPrice =
			parsed.headers.includes('price') || parsed.headers.includes('price_cents');
		for(const required of CATALOG_IMPORT_REQUIRED_HEADERS) {
			if(required === 'price') {
				if(!hasPrice) {
					errors.push({
						lineNumber: 1,
						column: 'price',
						message: 'Missing required column: price (or price_cents).',
						blocking: true,
					});
				}
				continue;
			}
			if(!parsed.headers.includes(required)) {
				errors.push({
					lineNumber: 1,
					column: required,
					message: `Missing required column: ${required}.`,
					blocking: true,
				});
			}
		}

		const uoms = await this.prisma.unitOfMeasure.findMany({
			select: { id: true, code: true },
		});
		const uomByCode = new Map(uoms.map((row) => [row.code.toUpperCase(), row]));

		const categories = await this.prisma.catalogCategory.findMany({
			select: { id: true, slug: true },
		});
		const categoryBySlug = new Map(categories.map((row) => [row.slug, row]));

		const existingOfferings = await this.prisma.productOffering.findMany({
			where: { vendorId },
			select: {
				id: true,
				sku: true,
				offeringKey: true,
				productId: true,
				product: { select: { slug: true } },
			},
		});
		const offeringByIdentity = new Map(
			existingOfferings.map((row) => [
				`${row.sku}::${row.offeringKey}`,
				row,
			]),
		);

		const existingProducts = await this.prisma.catalogProduct.findMany({
			where: { vendorId },
			select: { id: true, slug: true },
		});
		const productBySlug = new Map(existingProducts.map((row) => [row.slug, row]));

		const rows: ParsedOfferingRow[] = [];
		const seenIdentities = new Set<string>();

		for(const raw of parsed.rows) {
			const values = raw.values;
			const lineNumber = raw.lineNumber;

			if(values.vendor_slug && values.vendor_slug !== vendor.slug) {
				errors.push({
					lineNumber,
					column: 'vendor_slug',
					message: `vendor_slug must be ${vendor.slug} (or omitted).`,
					blocking: true,
				});
			}

			const productSlug = (values.product_slug ?? '').trim();
			const title = (values.title ?? '').trim();
			const sku = (values.sku ?? '').trim();
			const offeringKey = (values.offering_key ?? '').trim() || 'default';
			const uomCode = (values.uom_code ?? '').trim().toUpperCase();
			const roleRaw = (values.role ?? '').trim().toUpperCase();
			const identity = `${sku}::${offeringKey}`;

			if(!productSlug) {
				errors.push({
					lineNumber,
					column: 'product_slug',
					message: 'product_slug is required.',
					blocking: true,
				});
			}
			if(!title) {
				errors.push({
					lineNumber,
					column: 'title',
					message: 'title is required.',
					blocking: true,
				});
			}
			if(!sku) {
				errors.push({
					lineNumber,
					column: 'sku',
					message: 'sku is required.',
					blocking: true,
				});
			}
			if(!offeringKey) {
				errors.push({
					lineNumber,
					column: 'offering_key',
					message: 'offering_key is required.',
					blocking: true,
				});
			}
			if(seenIdentities.has(identity) && sku) {
				errors.push({
					lineNumber,
					column: 'offering_key',
					message: `Duplicate sku+offering_key in file: ${sku} / ${offeringKey}.`,
					blocking: true,
				});
			}
			seenIdentities.add(identity);

			if(!uomByCode.has(uomCode)) {
				errors.push({
					lineNumber,
					column: 'uom_code',
					message: `Unknown uom_code: ${uomCode || '(empty)'}.`,
					blocking: true,
				});
			}

			if(
				roleRaw !== ProductOfferingRole.STANDALONE &&
				roleRaw !== ProductOfferingRole.PACK &&
				roleRaw !== ProductOfferingRole.PIECE
			) {
				errors.push({
					lineNumber,
					column: 'role',
					message: 'role must be STANDALONE, PACK, or PIECE.',
					blocking: true,
				});
			}

			let priceCents: number | null = null;
			if(values.price_cents?.trim()) {
				const parsedCents = Number(values.price_cents);
				if(!Number.isFinite(parsedCents) || parsedCents < 0 || !Number.isInteger(parsedCents)) {
					errors.push({
						lineNumber,
						column: 'price_cents',
						message: 'price_cents must be a non-negative integer.',
						blocking: true,
					});
				}
				else {
					priceCents = parsedCents;
				}
			}
			else if(values.price?.trim()) {
				const dollars = Number(values.price);
				if(!Number.isFinite(dollars) || dollars < 0) {
					errors.push({
						lineNumber,
						column: 'price',
						message: 'price must be a non-negative number.',
						blocking: true,
					});
				}
				else {
					priceCents = Math.round(dollars * 100);
				}
			}
			else {
				errors.push({
					lineNumber,
					column: 'price',
					message: 'price or price_cents is required.',
					blocking: true,
				});
			}

			const parentOfferingKey = values.parent_offering_key?.trim() || undefined;
			const childQtyPerParent = values.child_qty_per_parent?.trim() || undefined;
			if(parentOfferingKey && !childQtyPerParent) {
				errors.push({
					lineNumber,
					column: 'child_qty_per_parent',
					message: 'child_qty_per_parent is required when parent_offering_key is set.',
					blocking: true,
				});
			}
			if(childQtyPerParent && Number(childQtyPerParent) <= 0) {
				errors.push({
					lineNumber,
					column: 'child_qty_per_parent',
					message: 'child_qty_per_parent must be > 0.',
					blocking: true,
				});
			}

			const categorySlug = values.category_slug?.trim() || undefined;
			if(categorySlug && !categoryBySlug.has(categorySlug)) {
				errors.push({
					lineNumber,
					column: 'category_slug',
					message: `Unknown category_slug: ${categorySlug}.`,
					blocking: true,
				});
			}

			let breakFeeMode: BreakFeeMode | undefined;
			if(values.break_fee_mode?.trim()) {
				const mode = values.break_fee_mode.trim().toUpperCase();
				const allowed = Object.values(BreakFeeMode) as string[];
				if(!allowed.includes(mode)) {
					errors.push({
						lineNumber,
						column: 'break_fee_mode',
						message: `Invalid break_fee_mode: ${values.break_fee_mode}.`,
						blocking: true,
					});
				}
				else {
					breakFeeMode = mode as BreakFeeMode;
				}
			}

			const existing = offeringByIdentity.get(identity);
			if(existing && existing.product.slug !== productSlug) {
				errors.push({
					lineNumber,
					column: 'product_slug',
					message: `sku+offering_key already belongs to product ${existing.product.slug}; moving products is not supported.`,
					blocking: true,
				});
			}

			const attributes: Array<{ key: string; value: string }> = [];
			for(const [header, value] of Object.entries(values)) {
				if(header.startsWith('attr.') && value.trim()) {
					attributes.push({
						key: header.slice('attr.'.length),
						value: value.trim(),
					});
				}
			}

			if(priceCents === null) {
				continue;
			}

			rows.push({
				lineNumber,
				productSlug,
				title,
				description: values.description?.trim() || undefined,
				categorySlug,
				active: parseOptionalBoolean(values.active),
				sku,
				offeringKey,
				uomCode,
				role: roleRaw as ProductOfferingRole,
				priceCents,
				currency: (values.currency?.trim() || 'USD').toUpperCase(),
				qtyOnHand: values.qty_on_hand?.trim() || '0',
				tracksOwnQty: parseOptionalBoolean(values.tracks_own_qty),
				minUnbrokenQty: values.min_unbroken_qty?.trim() || undefined,
				breakPoolAboveQty: values.break_pool_above_qty?.trim() || undefined,
				inheritQtyToChildren: parseOptionalBoolean(values.inherit_qty_to_children),
				parentOfferingKey,
				childQtyPerParent,
				breakFeeMode,
				breakFeeCents: values.break_fee_cents?.trim()
					? Number(values.break_fee_cents)
					: undefined,
				attributes,
				vendorSlug: values.vendor_slug?.trim() || undefined,
			});
		}

		// Second pass: parent keys must resolve within the same product slug, else uniquely in vendor
		for(const row of rows) {
			if(!row.parentOfferingKey) {
				continue;
			}
			const parentInSameProduct = rows.filter(
				(candidate) =>
					candidate.offeringKey === row.parentOfferingKey &&
					candidate.productSlug === row.productSlug,
			);
			const parentAnywhereInFile = rows.filter(
				(candidate) => candidate.offeringKey === row.parentOfferingKey,
			);
			const parentInDb = existingOfferings.filter(
				(candidate) => candidate.offeringKey === row.parentOfferingKey,
			);

			if(parentInSameProduct.length > 0) {
				continue;
			}
			if(parentAnywhereInFile.length === 1) {
				continue;
			}
			if(parentAnywhereInFile.length === 0 && parentInDb.length === 1) {
				continue;
			}
			if(parentAnywhereInFile.length === 0 && parentInDb.length === 0) {
				errors.push({
					lineNumber: row.lineNumber,
					column: 'parent_offering_key',
					message: `Unknown parent_offering_key: ${row.parentOfferingKey}.`,
					blocking: true,
				});
				continue;
			}
			errors.push({
				lineNumber: row.lineNumber,
				column: 'parent_offering_key',
				message: `Ambiguous parent_offering_key: ${row.parentOfferingKey}. Prefer a key unique within the product.`,
				blocking: true,
			});
		}

		return {
			rows,
			preview: this.toPreview(
				parsed.delimiter,
				rows,
				errors,
				vendorId,
				productBySlug,
				offeringByIdentity,
			),
		};
	}

	private toPreview(
		delimiter: ',' | '\t',
		rows: ParsedOfferingRow[],
		errors: ImportRowError[],
		_vendorId: string,
		productBySlug?: Map<string, { id: string; slug: string }>,
		offeringByIdentity?: Map<
			string,
			{ id: string; sku: string; offeringKey: string; productId: string }
		>,
	): ValidateResult {
		const blocking = errors.filter((row) => row.blocking);
		const warnings = errors.filter((row) => !row.blocking);
		const productSlugs = new Set(rows.map((row) => row.productSlug).filter(Boolean));
		let createProductCount = 0;
		let updateProductCount = 0;
		let createOfferingCount = 0;
		let updateOfferingCount = 0;

		for(const slug of productSlugs) {
			if(productBySlug?.has(slug)) {
				updateProductCount += 1;
			}
			else {
				createProductCount += 1;
			}
		}

		for(const row of rows) {
			const key = `${row.sku}::${row.offeringKey}`;
			if(offeringByIdentity?.has(key)) {
				updateOfferingCount += 1;
			}
			else {
				createOfferingCount += 1;
			}
		}

		return {
			delimiter,
			rowCount: rows.length,
			blockingErrorCount: blocking.length,
			warningCount: warnings.length,
			createProductCount,
			updateProductCount,
			createOfferingCount,
			updateOfferingCount,
			errors: errors.slice(0, 200),
			ok: blocking.length === 0 && rows.length > 0,
		};
	}

	private async runJob(jobId: string, vendorId: string, rows: ParsedOfferingRow[]) {
		await this.prisma.catalogImportJob.update({
			where: { id: jobId },
			data: { status: CatalogImportStatus.RUNNING },
		});

		const uoms = await this.prisma.unitOfMeasure.findMany();
		const uomByCode = new Map(uoms.map((row) => [row.code.toUpperCase(), row]));
		const categories = await this.prisma.catalogCategory.findMany();
		const categoryBySlug = new Map(categories.map((row) => [row.slug, row]));

		const byProduct = new Map<string, ParsedOfferingRow[]>();
		for(const row of rows) {
			const list = byProduct.get(row.productSlug) ?? [];
			list.push(row);
			byProduct.set(row.productSlug, list);
		}

		let createdCount = 0;
		let updatedCount = 0;
		const runtimeErrors: ImportRowError[] = [];
		const touchedProductIds = new Set<string>();
		const offeringIdByKey = new Map<string, string>();

		const existingOfferings = await this.prisma.productOffering.findMany({
			where: { vendorId },
			select: { id: true, sku: true, offeringKey: true },
		});
		for(const row of existingOfferings) {
			offeringIdByKey.set(row.offeringKey, row.id);
			offeringIdByKey.set(`${row.sku}::${row.offeringKey}`, row.id);
		}

		const productEntries = [...byProduct.entries()];
		const batchSize = 50;

		for(let offset = 0; offset < productEntries.length; offset += batchSize) {
			const batch = productEntries.slice(offset, offset + batchSize);

			for(const [slug, offeringRows] of batch) {
				try {
					const result = await this.upsertProductGroup({
						vendorId,
						slug,
						offeringRows,
						uomByCode,
						categoryBySlug,
					});
					touchedProductIds.add(result.productId);
					if(result.created) {
						createdCount += 1;
					}
					else {
						updatedCount += 1;
					}
					for(const [key, id] of result.offeringIds) {
						offeringIdByKey.set(key, id);
					}
				}
				catch(error) {
					runtimeErrors.push({
						lineNumber: offeringRows[0]?.lineNumber ?? 0,
						message:
							error instanceof Error
								? error.message
								: 'Failed to upsert product group.',
						blocking: true,
					});
				}
			}
		}

		// Containments after all offerings exist
		for(const row of rows) {
			if(!row.parentOfferingKey || !row.childQtyPerParent) {
				continue;
			}

			const parentSameProduct = rows.find(
				(candidate) =>
					candidate.offeringKey === row.parentOfferingKey &&
					candidate.productSlug === row.productSlug,
			);
			const parentAnywhere = rows.find(
				(candidate) => candidate.offeringKey === row.parentOfferingKey,
			);
			const parentRow = parentSameProduct ?? parentAnywhere;
			const parentId = parentRow
				? offeringIdByKey.get(`${parentRow.sku}::${parentRow.offeringKey}`) ??
					offeringIdByKey.get(parentRow.offeringKey)
				: offeringIdByKey.get(row.parentOfferingKey);
			const childId = offeringIdByKey.get(`${row.sku}::${row.offeringKey}`);

			if(!parentId || !childId) {
				runtimeErrors.push({
					lineNumber: row.lineNumber,
					column: 'parent_offering_key',
					message: 'Could not resolve parent/child offerings for containment.',
					blocking: true,
				});
				continue;
			}

			try {
				await this.prisma.offeringContainment.upsert({
					where: {
						parentOfferingId_childOfferingId: {
							parentOfferingId: parentId,
							childOfferingId: childId,
						},
					},
					create: {
						parentOfferingId: parentId,
						childOfferingId: childId,
						childQtyPerParent: new Decimal(row.childQtyPerParent),
					},
					update: {
						childQtyPerParent: new Decimal(row.childQtyPerParent),
					},
				});
			}
			catch(error) {
				runtimeErrors.push({
					lineNumber: row.lineNumber,
					message:
						error instanceof Error
							? error.message
							: 'Failed to upsert containment.',
					blocking: true,
				});
			}
		}

		for(const productId of touchedProductIds) {
			await this.inventory.refreshProductAvailability(productId);
		}

		await this.prisma.catalogImportJob.update({
			where: { id: jobId },
			data: {
				status:
					runtimeErrors.length > 0
						? CatalogImportStatus.COMPLETED
						: CatalogImportStatus.COMPLETED,
				createdCount,
				updatedCount,
				errorCount: runtimeErrors.length,
				errorsJson: runtimeErrors.slice(0, 200),
				finishedAt: new Date(),
			},
		});
	}

	private async upsertProductGroup(args: {
		vendorId: string;
		slug: string;
		offeringRows: ParsedOfferingRow[];
		uomByCode: Map<string, { id: string; code: string }>;
		categoryBySlug: Map<string, { id: string; slug: string }>;
	}) {
		const { vendorId, slug, offeringRows, uomByCode, categoryBySlug } = args;
		const head = offeringRows[offeringRows.length - 1];
		const categoryId = head.categorySlug
			? categoryBySlug.get(head.categorySlug)?.id
			: undefined;

		const existing = await this.prisma.catalogProduct.findUnique({
			where: {
				vendorId_slug: { vendorId, slug },
			},
			include: { offerings: true },
		});

		let productId: string;
		let created = false;

		if(!existing) {
			const product = await this.prisma.catalogProduct.create({
				data: {
					vendorId,
					slug,
					title: head.title,
					description: head.description,
					categoryId,
					active: head.active ?? true,
					breakFeeMode: head.breakFeeMode ?? BreakFeeMode.OFF,
					breakFeeCents: head.breakFeeCents ?? 0,
				},
			});
			productId = product.id;
			created = true;
		}
		else {
			await this.prisma.catalogProduct.update({
				where: { id: existing.id },
				data: {
					title: head.title,
					description: head.description ?? existing.description,
					categoryId: categoryId === undefined ? existing.categoryId : categoryId,
					active: head.active ?? existing.active,
					breakFeeMode: head.breakFeeMode ?? existing.breakFeeMode,
					breakFeeCents: head.breakFeeCents ?? existing.breakFeeCents,
				},
			});
			productId = existing.id;
		}

		const offeringIds = new Map<string, string>();

		for(const row of offeringRows) {
			const uom = uomByCode.get(row.uomCode);
			if(!uom) {
				throw new BadRequestException(`Unknown UOM ${row.uomCode}`);
			}

			const identityWhere = {
				vendorId_sku_offeringKey: {
					vendorId,
					sku: row.sku,
					offeringKey: row.offeringKey,
				},
			};

			const existingOffering = await this.prisma.productOffering.findUnique({
				where: identityWhere,
			});

			if(existingOffering) {
				if(existingOffering.productId !== productId) {
					throw new BadRequestException(
						`Offering ${row.sku}/${row.offeringKey} belongs to another product.`,
					);
				}

				const updated = await this.prisma.productOffering.update({
					where: { id: existingOffering.id },
					data: {
						uomId: uom.id,
						role: row.role,
						priceCents: row.priceCents,
						currency: row.currency,
						qtyOnHand: new Decimal(row.qtyOnHand),
						tracksOwnQty: row.tracksOwnQty ?? existingOffering.tracksOwnQty,
						minUnbrokenQty:
							row.minUnbrokenQty !== undefined
								? new Decimal(row.minUnbrokenQty)
								: undefined,
						breakPoolAboveQty:
							row.breakPoolAboveQty !== undefined
								? new Decimal(row.breakPoolAboveQty)
								: undefined,
						inheritQtyToChildren:
							row.inheritQtyToChildren ?? existingOffering.inheritQtyToChildren,
					},
				});
				offeringIds.set(row.offeringKey, updated.id);
				offeringIds.set(`${row.sku}::${row.offeringKey}`, updated.id);
			}
			else {
				// Role+uom uniqueness: if conflicting, update that row's identity carefully
				const roleConflict = await this.prisma.productOffering.findUnique({
					where: {
						productId_uomId_role: {
							productId,
							uomId: uom.id,
							role: row.role,
						},
					},
				});

				if(roleConflict) {
					const updated = await this.prisma.productOffering.update({
						where: { id: roleConflict.id },
						data: {
							sku: row.sku,
							offeringKey: row.offeringKey,
							priceCents: row.priceCents,
							currency: row.currency,
							qtyOnHand: new Decimal(row.qtyOnHand),
							tracksOwnQty: row.tracksOwnQty ?? roleConflict.tracksOwnQty,
							minUnbrokenQty:
								row.minUnbrokenQty !== undefined
									? new Decimal(row.minUnbrokenQty)
									: undefined,
							breakPoolAboveQty:
								row.breakPoolAboveQty !== undefined
									? new Decimal(row.breakPoolAboveQty)
									: undefined,
							inheritQtyToChildren:
								row.inheritQtyToChildren ?? roleConflict.inheritQtyToChildren,
						},
					});
					offeringIds.set(row.offeringKey, updated.id);
					offeringIds.set(`${row.sku}::${row.offeringKey}`, updated.id);
				}
				else {
					const createdOffering = await this.prisma.productOffering.create({
						data: {
							productId,
							vendorId,
							sku: row.sku,
							offeringKey: row.offeringKey,
							uomId: uom.id,
							role: row.role,
							priceCents: row.priceCents,
							currency: row.currency,
							qtyOnHand: new Decimal(row.qtyOnHand),
							tracksOwnQty: row.tracksOwnQty ?? true,
							minUnbrokenQty:
								row.minUnbrokenQty !== undefined
									? new Decimal(row.minUnbrokenQty)
									: -1,
							breakPoolAboveQty:
								row.breakPoolAboveQty !== undefined
									? new Decimal(row.breakPoolAboveQty)
									: 0,
							inheritQtyToChildren: row.inheritQtyToChildren ?? false,
						},
					});
					offeringIds.set(row.offeringKey, createdOffering.id);
					offeringIds.set(`${row.sku}::${row.offeringKey}`, createdOffering.id);
				}
			}

			for(const [index, attribute] of row.attributes.entries()) {
				await this.prisma.productAttribute.upsert({
					where: {
						productId_key: {
							productId,
							key: attribute.key,
						},
					},
					create: {
						productId,
						key: attribute.key,
						value: attribute.value,
						sortOrder: index,
					},
					update: {
						value: attribute.value,
					},
				});
			}
		}

		return { productId, created, offeringIds };
	}
}

function parseOptionalBoolean(value?: string): boolean | undefined {
	if(value === undefined || value.trim() === '') {
		return undefined;
	}
	const normalized = value.trim().toLowerCase();
	if(['1', 'true', 'yes', 'y'].includes(normalized)) {
		return true;
	}
	if(['0', 'false', 'no', 'n'].includes(normalized)) {
		return false;
	}
	return undefined;
}
