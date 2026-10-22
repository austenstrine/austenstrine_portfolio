import {
	IsArray,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	Min,
	MinLength,
} from 'class-validator';

export class UpsertVendorAttributeValueDto {
	@IsUUID()
	vendorId!: string;

	@IsUUID()
	attributeId!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(80)
	value!: string;

	@IsOptional()
	@IsUUID()
	parentId?: string;

	@IsArray()
	@IsUUID('4', { each: true })
	categoryIds!: string[];

	@IsOptional()
	@IsUUID()
	groupId?: string;

	@IsOptional()
	@IsInt()
	@Min(0)
	sortOrder?: number;
}

export class CreateGlobalAttributeValueDto {
	@IsUUID()
	attributeId!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(80)
	value!: string;

	@IsOptional()
	@IsInt()
	@Min(0)
	sortOrder?: number;
}
