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
import { QtyCompoundDto } from './qty-compound.dto';

class ProductOfferingInputDto {
	@IsOptional()
	@IsString()
	@MaxLength(40)
	clientKey?: string;

	@IsOptional()
	@IsString()
	@MaxLength(80)
	offeringKey?: string;

	@IsString()
	@MaxLength(80)
	sku!: string;

	@IsUUID()
	uomId!: string;

	@IsEnum(ProductOfferingRole)
	role!: ProductOfferingRole;

	@IsInt()
	@Min(0)
	priceCents!: number;

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

class LegacyPackPieceLinkInputDto {
	@IsString()
	pieceQtyPerPack!: string;
}

export class CreateCatalogProductDto {
	@IsUUID()
	vendorId!: string;

	@IsOptional()
	@IsUUID()
	categoryId?: string;

	/** @deprecated Use per-offering sku */
	@IsOptional()
	@IsString()
	@MaxLength(80)
	sku?: string;

	@IsString()
	@MaxLength(120)
	slug!: string;

	@IsString()
	@MinLength(2)
	@MaxLength(200)
	title!: string;

	@IsOptional()
	@IsString()
	@MaxLength(5000)
	description?: string;

	@IsOptional()
	@IsBoolean()
	inventoryFromAllocations?: boolean;

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
	@IsArray()
	@IsString({ each: true })
	@MaxLength(60, { each: true })
	tags?: string[];

	@ValidateNested({ each: true })
	@Type(() => ProductOfferingInputDto)
	@IsArray()
	offerings!: ProductOfferingInputDto[];

	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => OfferingContainmentInputDto)
	@IsArray()
	containments?: OfferingContainmentInputDto[];

	/** @deprecated Use containments */
	@IsOptional()
	@ValidateNested()
	@Type(() => LegacyPackPieceLinkInputDto)
	packPieceLink?: LegacyPackPieceLinkInputDto;
}
