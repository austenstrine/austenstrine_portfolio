import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewRoadmapSuggestionDto {
	@ApiProperty({ enum: ['approve', 'reject'] })
	@IsIn(['approve', 'reject'])
	decision!: 'approve' | 'reject';

	@ApiPropertyOptional({
		description: 'Optional plain-language note when rejecting',
		maxLength: 500,
	})
	@IsOptional()
	@IsString()
	@MaxLength(500)
	reason?: string;
}
