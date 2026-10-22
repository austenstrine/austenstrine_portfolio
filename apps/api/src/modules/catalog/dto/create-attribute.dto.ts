import { AttributeValueKind } from '@prisma/client';
import {
	IsBoolean,
	IsEnum,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateAttributeDto {
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	name!: string;

	@IsOptional()
	@IsUUID()
	vendorId?: string;

	@IsOptional()
	@IsBoolean()
	asGlobal?: boolean;

	@IsOptional()
	@IsEnum(AttributeValueKind)
	valueKind?: AttributeValueKind;

	@IsOptional()
	@IsString()
	@MaxLength(24)
	unit?: string;

	@IsOptional()
	@IsString()
	minNumeric?: string;

	@IsOptional()
	@IsString()
	maxNumeric?: string;
}
