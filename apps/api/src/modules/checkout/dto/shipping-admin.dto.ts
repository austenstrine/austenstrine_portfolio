import { PayoutTrigger } from '@prisma/client';
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

class ShippingRateInputDto {
	@IsOptional()
	@IsUUID()
	id?: string;

	@IsString()
	@MinLength(1)
	@MaxLength(120)
	label!: string;

	@IsInt()
	@Min(0)
	amountCents!: number;

	@IsOptional()
	@IsInt()
	@Min(0)
	minSubtotalCents?: number | null;

	@IsOptional()
	@IsInt()
	@Min(0)
	maxSubtotalCents?: number | null;
}

export class UpsertShippingProfileDto {
	@IsString()
	@MinLength(1)
	@MaxLength(40)
	code!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(120)
	name!: string;

	@IsOptional()
	@IsBoolean()
	shipsSeparately?: boolean;

	@IsOptional()
	@IsEnum(PayoutTrigger)
	payoutTrigger?: PayoutTrigger;

	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ShippingRateInputDto)
	rates?: ShippingRateInputDto[];
}

export class AssignProductShippingDto {
	@IsOptional()
	@IsUUID()
	shippingProfileId?: string | null;
}
