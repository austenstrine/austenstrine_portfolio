import { BreakFeeMode } from '@prisma/client';
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

class ProductOfferingPatchDto {
	@IsUUID()
	id!: string;

	@IsOptional()
	@IsString()
	@MaxLength(80)
	sku?: string;

	@IsOptional()
	@IsString()
	@MaxLength(80)
	offeringKey?: string;

	@IsOptional()
	@IsInt()
	@Min(0)
	priceCents?: number;

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

export class UpdateCatalogProductDto extends ProductMeasureFieldsDto {
	@IsOptional()
	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title?: string;

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
	@IsUUID('4', { each: true })
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
	@Type(() => ProductOfferingPatchDto)
	@IsArray()
	offerings?: ProductOfferingPatchDto[];
}
