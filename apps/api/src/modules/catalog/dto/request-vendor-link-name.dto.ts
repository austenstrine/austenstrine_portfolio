import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RequestVendorLinkNameDto {
	@ApiProperty({
		description: 'Requested name in the vendor management / store link',
		example: 'demo-supply-co',
	})
	@IsString()
	@MinLength(2)
	@MaxLength(80)
	@Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
		message: 'The name in the link can only use lowercase letters, numbers, and hyphens.',
	})
	linkName!: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;
}
