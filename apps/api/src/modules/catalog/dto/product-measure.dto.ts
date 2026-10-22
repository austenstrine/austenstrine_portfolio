import { ProductCondition } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Min,
	ValidateNested,
} from 'class-validator';

export class ProductMeasureFieldsDto {
	@IsOptional()
	@IsString()
	lengthNumeric?: string | null;

	@IsOptional()
	@IsString()
	widthNumeric?: string | null;

	@IsOptional()
	@IsString()
	heightNumeric?: string | null;

	@IsOptional()
	@IsString()
	linearUnit?: string | null;

	@IsOptional()
	@IsString()
	weightNumeric?: string | null;

	@IsOptional()
	@IsString()
	weightUnit?: string | null;

	@IsOptional()
	@IsString()
	packageLengthNumeric?: string | null;

	@IsOptional()
	@IsString()
	packageWidthNumeric?: string | null;

	@IsOptional()
	@IsString()
	packageHeightNumeric?: string | null;

	@IsOptional()
	@IsString()
	packageLinearUnit?: string | null;

	@IsOptional()
	@IsString()
	packageWeightNumeric?: string | null;

	@IsOptional()
	@IsString()
	packageWeightUnit?: string | null;

	@IsOptional()
	@IsString()
	volumeNumeric?: string | null;

	@IsOptional()
	@IsString()
	volumeUnit?: string | null;

	@IsOptional()
	@IsString()
	netContentNumeric?: string | null;

	@IsOptional()
	@IsString()
	netContentUnit?: string | null;

	@IsOptional()
	@IsInt()
	@Min(0)
	piecesPerRetailUnit?: number | null;

	@IsOptional()
	@IsString()
	voltageNumeric?: string | null;

	@IsOptional()
	@IsString()
	wattageNumeric?: string | null;

	@IsOptional()
	@IsString()
	amperageNumeric?: string | null;

	@IsOptional()
	@IsString()
	frequencyHzNumeric?: string | null;

	@IsOptional()
	@IsString()
	capacityNumeric?: string | null;

	@IsOptional()
	@IsString()
	capacityUnit?: string | null;

	@IsOptional()
	@IsString()
	gtin?: string | null;

	@IsOptional()
	@IsString()
	mpn?: string | null;

	@IsOptional()
	@IsString()
	countryOfOrigin?: string | null;

	@IsOptional()
	@IsEnum(ProductCondition)
	condition?: ProductCondition;

	@IsOptional()
	@IsString()
	releaseAt?: string | null;

	@IsOptional()
	@IsString()
	expiresAt?: string | null;
}

export class ProductScalarValueInputDto {
	@IsUUID()
	attributeId!: string;

	@IsOptional()
	@IsString()
	stringValue?: string | null;

	@IsOptional()
	@IsString()
	numericValue?: string | null;

	@IsOptional()
	@IsBoolean()
	booleanValue?: boolean | null;
}

export class ProductScalarValuesDto {
	@IsOptional()
	@ValidateNested({ each: true })
	@Type(() => ProductScalarValueInputDto)
	@IsArray()
	scalarValues?: ProductScalarValueInputDto[];
}
