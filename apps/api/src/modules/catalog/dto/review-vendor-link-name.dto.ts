import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ReviewVendorLinkNameDto {
	@ApiProperty({ enum: ['approve', 'deny'] })
	@IsIn(['approve', 'deny'])
	decision!: 'approve' | 'deny';

	@ApiPropertyOptional({
		description: 'Plain-language reason (required when denying)',
		example: 'Too similar to another seller’s name in the link.',
	})
	@ValidateIf((dto: ReviewVendorLinkNameDto) => dto.decision === 'deny')
	@IsString()
	@MinLength(3)
	@MaxLength(500)
	reason?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;
}
