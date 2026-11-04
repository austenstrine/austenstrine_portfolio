import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateVendorDto {
	@ApiProperty()
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	name!: string;

	@ApiProperty({
		description: 'Unique name in the vendor / store link (stored as Vendor.slug)',
		example: 'demo-supply-co',
	})
	@IsString()
	@MinLength(2)
	@MaxLength(80)
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
		message: 'The name in the link can only use lowercase letters, numbers, and hyphens.',
	})
	slug!: string;
}
