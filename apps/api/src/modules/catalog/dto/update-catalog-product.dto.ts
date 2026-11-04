import { BreakFeeMode, ProductOfferingRole } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	Min,
	MinLength,
	ValidateNested,
} from 'class-validator';
import {
	ProductMeasureFieldsDto,
	ProductScalarValueInputDto,
} from './product-measure.dto';
import { QtyCompoundDto } from './qty-compound.dto';

/**
 * Patch an existing offering (id set) or create one on the product (id omitted).
 * Create requires uomId, role, sku, and priceCents.
 */
class ProductOfferingUpsertDto {
	@IsOptional()
	@IsUUID()
	id?: string;

	@IsOptional()
	@IsString()
	@MaxLength(40)
	clientKey?: string;

	@IsOptional()
	@IsString()
	@MaxLength(80)
	sku?: string;

	@IsOptional()
	@IsString()
	@MaxLength(80)
	offeringKey?: string;

	@IsOptional()
	@IsUUID()
	uomId?: string;

	@IsOptional()
	@IsEnum(ProductOfferingRole)
	role?: ProductOfferingRole;

	@IsOptional()
	@IsInt()
	@Min(0)
	priceCents?: number;

	@IsOptional()
	@IsString()
	@MaxLength(3)
	currency?: string;

	@IsOptional()
	@IsString()
	qtyOnHand?: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => QtyCompoundDto)
	qtyCompound?: QtyCompoundDto;

	@IsOptional()
	@IsBoolean()
	tracksOwnQty?: boolean;

	@IsOptional()
	@IsString()
	minUnbrokenQty?: string;

	@IsOptional()
	@IsString()
	breakPoolAboveQty?: string;

	@IsOptional()
	@IsBoolean()
	inheritQtyToChildren?: boolean;
}

class OfferingContainmentInputDto {
	@IsOptional()
	@IsString()
	@MaxLength(40)
	parentOfferingKey?: string;

	@IsOptional()
	@IsUUID()
	parentOfferingId?: string;

	@IsOptional()
	@IsString()
	@MaxLength(40)
	childOfferingKey?: string;

	@IsOptional()
	@IsUUID()
	childOfferingId?: string;

	@IsString()
	childQtyPerParent!: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => QtyCompoundDto)
	childQtyCompound?: QtyCompoundDto;

	@IsOptional()
	@IsInt()
	@Min(0)
	breakFeeCents?: number;
}

export class UpdateCatalogProductDto extends ProductMeasureFieldsDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title?: string;

	@IsOptional()
	@IsString()
	@MaxLength(120)
	slug?: string;

	@IsOptional()
	@IsString()
	@MaxLength(5000)
	description?: string;

	@IsOptional()
	@IsBoolean()
	active?: boolean;

	@IsOptional()
	@IsBoolean()
	inventoryFromAllocations?: boolean;

	@IsOptional()
	@IsUUID()
	categoryId?: string;

	@IsOptional()
	@IsEnum(BreakFeeMode)
	breakFeeMode?: BreakFeeMode;

	@IsOptional()
	@IsInt()
	@Min(0)
	breakFeeCents?: number;

	@IsOptional()
	@IsArray()
	@IsUUID('all', { each: true })
	attributeValueIds?: string[];

	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => ProductScalarValueInputDto)
	@IsArray()
	scalarValues?: ProductScalarValueInputDto[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@MaxLength(60, { each: true })
	tags?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@MaxLength(500, { each: true })
	imageUrls?: string[];

	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => ProductOfferingUpsertDto)
	@IsArray()
	offerings?: ProductOfferingUpsertDto[];

	/** When set, replaces all containments among this product's offerings. */
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => OfferingContainmentInputDto)
	@IsArray()
	containments?: OfferingContainmentInputDto[];
}
