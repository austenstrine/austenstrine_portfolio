import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsArray,
	IsNumberString,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateUomDto {
	@ApiProperty({ example: 'ft' })
	@IsString()
	@MinLength(1)
	@MaxLength(40)
	code!: string;

	@ApiProperty({ example: 'Foot' })
	@IsString()
	@MinLength(1)
	@MaxLength(80)
	label!: string;

	@ApiProperty({ example: 'length' })
	@IsString()
	@MinLength(1)
	@MaxLength(40)
	dimensionKey!: string;

	@ApiProperty({
		example: '0.3048',
		description: 'Multiply quantity in this UOM by this factor to reach the dimension reference unit.',
	})
	@IsNumberString()
	factorToReference!: string;

	@ApiPropertyOptional({
		description: 'Vendor that owns this UOM. Omit only when creating a global UOM as supervendor.',
	})
	@IsOptional()
	@IsUUID()
	vendorId?: string;

	@ApiPropertyOptional({ type: [String], example: ['foot', "'"] })
	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	@MaxLength(40, { each: true })
	aliases?: string[];

	@ApiPropertyOptional()
	@IsOptional()
	metadata?: Record<string, unknown>;
}
