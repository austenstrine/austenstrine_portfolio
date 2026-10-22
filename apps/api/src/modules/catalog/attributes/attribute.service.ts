import {
	BadRequestException,
	ForbiddenException,
	Injectable,
	Logger,
	NotFoundException,
	OnModuleInit,
} from '@nestjs/common';
import { AttributeValueKind } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../../infra/prisma/prisma.service';
import { VendorAccessService } from '../vendor-access.service';

export type ScalarValueInput = {
	attributeId: string;
	stringValue?: string | null;
	numericValue?: string | null;
	booleanValue?: boolean | null;
};

export type VendorValueInput = {
	attributeId: string;
	value: string;
	parentId?: string | null;
	categoryIds: string[];
	groupId?: string;
	sortOrder?: number;
};

@Injectable()
export class AttributeService implements OnModuleInit {
	private readonly logger = new Logger(AttributeService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly vendorAccess: VendorAccessService,
	) {}

	onModuleInit() {
		void this.runHealthSweep().catch((error) => {
			this.logger.error('Attribute health sweep failed', error as Error);
		});
		setInterval(() => {
			void this.runHealthSweep().catch((error) => {
				this.logger.error('Attribute health sweep failed', error as Error);
			});
		}, 24 * 60 * 60 * 1000);
	}

	async listAttributes(vendorId?: string) {
		const rows = await this.prisma.attribute.findMany({
			where: vendorId
				? { OR: [{ vendorId: null }, { vendorId }] }
				: { vendorId: null },
			include: {
				values: {
					where: vendorId
						? { OR: [{ vendorId: null }, { vendorId }] }
						: { vendorId: null },
					orderBy: { sortOrder: 'asc' },
				},
			},
			orderBy: { name: 'asc' },
		});

		return rows.map((attribute) => ({
			id: attribute.id,
			name: attribute.name,
			vendorId: attribute.vendorId,
			valueKind: attribute.valueKind,
			unit: attribute.unit,
			minNumeric: attribute.minNumeric?.toString() ?? null,
			maxNumeric: attribute.maxNumeric?.toString() ?? null,
			values: this.compressValues(attribute.values),
		}));
	}

	async createAttribute(
		userId: string,
		dto: {
			name: string;
			vendorId?: string | null;
			valueKind?: AttributeValueKind;
			unit?: string | null;
			minNumeric?: string | null;
			maxNumeric?: string | null;
			asGlobal?: boolean;
		},
	) {
		const asGlobal = Boolean(dto.asGlobal && !dto.vendorId);
		if(asGlobal) {
			await this.vendorAccess.assertIsSuperVendorMember(userId);
		}
		else if(dto.vendorId) {
			await this.vendorAccess.assertCanEditVendor(userId, dto.vendorId);
		}
		else {
			throw new BadRequestException('Choose a vendor or create a global attribute.');
		}

		return this.prisma.attribute.create({
			data: {
				name: dto.name.trim(),
				vendorId: asGlobal ? null : dto.vendorId,
				valueKind: dto.valueKind ?? AttributeValueKind.OPTION,
				unit: dto.unit ?? null,
				minNumeric: dto.minNumeric ? new Decimal(dto.minNumeric) : null,
				maxNumeric: dto.maxNumeric ? new Decimal(dto.maxNumeric) : null,
			},
		});
	}

	async upsertVendorValue(userId: string, vendorId: string, dto: VendorValueInput) {
		await this.vendorAccess.assertCanEditVendor(userId, vendorId);
		const vendor = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
		if(!vendor) {
			throw new NotFoundException('Vendor not found.');
		}

		const uniqueCategories = [...new Set(dto.categoryIds.filter(Boolean))];
		if(uniqueCategories.length === 0) {
			throw new BadRequestException('Vendor attribute values need at least one category.');
		}
		if(uniqueCategories.length > vendor.maxCategoriesPerAttributeValue) {
			throw new BadRequestException(
				`This vendor may assign at most ${vendor.maxCategoriesPerAttributeValue} categories per value.`,
			);
		}

		const attribute = await this.prisma.attribute.findUnique({
			where: { id: dto.attributeId },
		});
		if(!attribute) {
			throw new NotFoundException('Attribute not found.');
		}
		if(attribute.valueKind !== AttributeValueKind.OPTION) {
			throw new BadRequestException('Only option attributes accept selectable values.');
		}

		if(dto.parentId) {
			const parent = await this.prisma.attributeValue.findUnique({
				where: { id: dto.parentId },
			});
			if(!parent || parent.attributeId !== attribute.id || parent.vendorId) {
				throw new BadRequestException(
					'A vendor value may only roll up to a global value of the same attribute.',
				);
			}
		}

		const groupId = dto.groupId || randomUUID();
		const existing = await this.prisma.attributeValue.findMany({
			where: { groupId, vendorId },
		});
		const keep = new Set(uniqueCategories);

		for(const row of existing) {
			if(row.categoryId && !keep.has(row.categoryId)) {
				await this.prisma.attributeValue.delete({ where: { id: row.id } });
			}
		}

		const remaining = await this.prisma.attributeValue.findMany({
			where: { groupId, vendorId },
		});
		const have = new Set(remaining.map((row) => row.categoryId).filter(Boolean) as string[]);

		for(const categoryId of uniqueCategories) {
			const shared = {
				value: dto.value.trim(),
				parentId: dto.parentId ?? null,
				sortOrder: dto.sortOrder ?? 0,
				attributeId: dto.attributeId,
				vendorId,
				groupId,
				categoryId,
			};
			const current = remaining.find((row) => row.categoryId === categoryId);
			if(current) {
				await this.prisma.attributeValue.update({
					where: { id: current.id },
					data: shared,
				});
			}
			else if(!have.has(categoryId)) {
				await this.prisma.attributeValue.create({ data: shared });
			}
		}

		await this.prisma.attributeValue.updateMany({
			where: { groupId, vendorId },
			data: {
				value: dto.value.trim(),
				parentId: dto.parentId ?? null,
				sortOrder: dto.sortOrder ?? 0,
			},
		});

		const rows = await this.prisma.attributeValue.findMany({
			where: { groupId, vendorId },
			orderBy: { sortOrder: 'asc' },
		});
		return this.compressValues(rows)[0];
	}

	async createGlobalValue(
		userId: string,
		dto: { attributeId: string; value: string; sortOrder?: number },
	) {
		await this.vendorAccess.assertIsSuperVendorMember(userId);
		return this.prisma.attributeValue.create({
			data: {
				attributeId: dto.attributeId,
				value: dto.value.trim(),
				vendorId: null,
				parentId: null,
				categoryId: null,
				groupId: null,
				sortOrder: dto.sortOrder ?? 0,
			},
		});
	}

	async resolveOptionValueIds(productCategoryId: string | null, valueIds: string[]) {
		if(valueIds.length === 0) {
			return [];
		}
		const rows = await this.prisma.attributeValue.findMany({
			where: { id: { in: valueIds } },
			include: { attribute: true },
		});
		const resolved: string[] = [];
		for(const requestedId of valueIds) {
			const row = rows.find((item) => item.id === requestedId);
			if(!row) {
				throw new BadRequestException('Unknown attribute value.');
			}
			if(row.attribute.valueKind !== AttributeValueKind.OPTION) {
				throw new BadRequestException('Scalar attributes cannot be assigned as options.');
			}
			if(!row.vendorId) {
				resolved.push(row.id);
				continue;
			}
			if(!productCategoryId) {
				throw new BadRequestException(
					'Assign a category before using vendor-scoped attribute values.',
				);
			}
			const physical = await this.physicalValueForCategory(row, productCategoryId);
			resolved.push(physical);
		}
		return [...new Set(resolved)];
	}

	async replaceScalarValues(productId: string, values: ScalarValueInput[]) {
		await this.prisma.productScalarValue.deleteMany({ where: { productId } });
		if(values.length === 0) {
			return;
		}
		const attributes = await this.prisma.attribute.findMany({
			where: { id: { in: values.map((row) => row.attributeId) } },
		});
		const byId = new Map(attributes.map((row) => [row.id, row]));
		await this.prisma.productScalarValue.createMany({
			data: values.map((row) => {
				const attribute = byId.get(row.attributeId);
				if(!attribute) {
					throw new BadRequestException('Unknown scalar attribute.');
				}
				if(attribute.valueKind === AttributeValueKind.OPTION) {
					throw new BadRequestException('Option attributes cannot store scalar values.');
				}
				return {
					productId,
					attributeId: row.attributeId,
					stringValue:
						attribute.valueKind === AttributeValueKind.SCALAR_STRING
							? (row.stringValue ?? null)
							: null,
					numericValue:
						attribute.valueKind === AttributeValueKind.SCALAR_NUMBER && row.numericValue
							? new Decimal(row.numericValue)
							: null,
					booleanValue:
						attribute.valueKind === AttributeValueKind.SCALAR_BOOLEAN
							? Boolean(row.booleanValue)
							: null,
				};
			}),
		});
	}

	async healthReport() {
		return this.collectHealthIssues();
	}

	async healthReportForUser(userId: string) {
		const isSuper = await this.vendorAccess.isSuperVendorMember(userId);
		assertCanReadHealth(isSuper);
		return this.healthReport();
	}

	async runHealthSweep() {
		const issues = await this.collectHealthIssues();
		if(issues.length === 0) {
			this.logger.log('Attribute health sweep: no issues');
			return issues;
		}
		this.logger.warn(`Attribute health sweep: ${issues.length} issue(s)`);
		for(const issue of issues.slice(0, 50)) {
			this.logger.warn(issue);
		}
		return issues;
	}

	private compressValues(
		values: Array<{
			id: string;
			value: string;
			vendorId: string | null;
			parentId: string | null;
			categoryId?: string | null;
			groupId?: string | null;
			sortOrder: number;
		}>,
	) {
		const groups = new Map<string, {
			id: string;
			groupId: string | null;
			value: string;
			vendorId: string | null;
			parentId: string | null;
			categoryIds: string[];
			sortOrder: number;
		}>();
		for(const row of values) {
			const key = row.vendorId
				? (row.groupId || `loose:${row.id}`)
				: row.id;
			const existing = groups.get(key);
			if(existing) {
				if(row.categoryId) {
					existing.categoryIds.push(row.categoryId);
				}
				continue;
			}
			groups.set(key, {
				id: row.id,
				groupId: row.groupId ?? null,
				value: row.value,
				vendorId: row.vendorId,
				parentId: row.parentId,
				categoryIds: row.categoryId ? [row.categoryId] : [],
				sortOrder: row.sortOrder,
			});
		}
		return [...groups.values()];
	}

	private async physicalValueForCategory(
		row: { id: string; vendorId: string | null; groupId: string | null; categoryId: string | null },
		categoryId: string,
	) {
		if(!row.vendorId) {
			return row.id;
		}
		const chain = await this.categoryAncestorIds(categoryId);
		const siblings = row.groupId
			? await this.prisma.attributeValue.findMany({
				where: { groupId: row.groupId, vendorId: row.vendorId },
			})
			: [row];
		for(const candidate of chain) {
			const match = siblings.find((item) => item.categoryId === candidate);
			if(match) {
				return match.id;
			}
		}
		throw new BadRequestException(
			'That vendor value is not assigned to this product category.',
		);
	}

	private async categoryAncestorIds(categoryId: string): Promise<string[]> {
		const ids = [categoryId];
		let current = await this.prisma.catalogCategory.findUnique({
			where: { id: categoryId },
			select: { parentId: true },
		});
		while(current?.parentId) {
			ids.push(current.parentId);
			current = await this.prisma.catalogCategory.findUnique({
				where: { id: current.parentId },
				select: { parentId: true },
			});
		}
		return ids;
	}

	private async collectHealthIssues(): Promise<string[]> {
		const issues: string[] = [];
		const vendorValues = await this.prisma.attributeValue.findMany({
			where: { vendorId: { not: null } },
			include: {
				parent: true,
				attribute: true,
				vendor: true,
			},
		});
		const byGroup = new Map<string, typeof vendorValues>();
		for(const row of vendorValues) {
			if(!row.categoryId) {
				issues.push(`Vendor value ${row.id} (${row.value}) is missing categoryId.`);
			}
			if(row.parentId) {
				if(!row.parent || row.parent.vendorId || row.parent.attributeId !== row.attributeId) {
					issues.push(
						`Vendor value ${row.id} parentId is not a global value of the same attribute.`,
					);
				}
			}
			if(row.groupId) {
				const list = byGroup.get(row.groupId) ?? [];
				list.push(row);
				byGroup.set(row.groupId, list);
			}
		}
		for(const [groupId, rows] of byGroup) {
			const vendor = rows[0]?.vendor;
			const limit = vendor?.maxCategoriesPerAttributeValue ?? 3;
			if(rows.length > limit) {
				issues.push(
					`Group ${groupId} has ${rows.length} categories; vendor limit is ${limit}.`,
				);
			}
			const valueSet = new Set(rows.map((row) => row.value));
			const parentSet = new Set(rows.map((row) => row.parentId ?? ''));
			if(valueSet.size > 1 || parentSet.size > 1) {
				issues.push(`Group ${groupId} has inconsistent value/parent fields.`);
			}
		}
		return issues;
	}
}

export function assertCanReadHealth(isSuper: boolean) {
	if(!isSuper) {
		throw new ForbiddenException('Only the supervendor can view attribute health.');
	}
}
