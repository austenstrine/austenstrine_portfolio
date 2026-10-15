import { Type } from 'class-transformer';
import {
	IsArray,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	MinLength,
	ValidateNested,
} from 'class-validator';

class AddressDto {
	@IsString()
	@MinLength(1)
	@MaxLength(120)
	name!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(200)
	line1!: string;

	@IsOptional()
	@IsString()
	@MaxLength(200)
	line2?: string;

	@IsString()
	@MinLength(1)
	@MaxLength(120)
	city!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(120)
	region!: string;

	@IsString()
	@MinLength(1)
	@MaxLength(32)
	postal!: string;

	@IsOptional()
	@IsString()
	@MaxLength(2)
	country?: string;
}

class ShipmentPickDto {
	@IsString()
	groupKey!: string;

	@IsUUID()
	rateId!: string;

	@IsOptional()
	@ValidateNested()
	@Type(() => AddressDto)
	address?: AddressDto;
}

export class CreateCheckoutSessionDto {
	@ValidateNested()
	@Type(() => AddressDto)
	address!: AddressDto;

	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ShipmentPickDto)
	shipments!: ShipmentPickDto[];
}
