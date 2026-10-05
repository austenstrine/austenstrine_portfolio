import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

class ProductAttributePatchDto {
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

class ProductOfferingPatchDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsString()
  qtyOnHand?: string;

  @IsOptional()
  @IsBoolean()
  tracksOwnQty?: boolean;
}

export class UpdateCatalogProductDto {
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
  @ValidateNested({ each: true })
  @Type(() => ProductAttributePatchDto)
  @IsArray()
  attributes?: ProductAttributePatchDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProductOfferingPatchDto)
  @IsArray()
  offerings?: ProductOfferingPatchDto[];
}
