import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductOfferingRole } from '@prisma/client';
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

class ProductAttributeInputDto {
  @IsString()
  @MaxLength(120)
  key!: string;

  @IsString()
  @MaxLength(500)
  value!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;
}

class ProductOfferingInputDto {
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
  @IsBoolean()
  tracksOwnQty?: boolean;
}

class PackPieceLinkInputDto {
  @IsString()
  pieceQtyPerPack!: string;
}

export class CreateCatalogProductDto {
  @IsUUID()
  vendorId!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  @MaxLength(80)
  sku!: string;

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
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInputDto)
  @IsArray()
  attributes?: ProductAttributeInputDto[];

  @ValidateNested({ each: true })
  @Type(() => ProductOfferingInputDto)
  @IsArray()
  offerings!: ProductOfferingInputDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PackPieceLinkInputDto)
  packPieceLink?: PackPieceLinkInputDto;
}
