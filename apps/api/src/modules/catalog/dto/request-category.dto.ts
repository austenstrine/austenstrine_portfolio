import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestCategoryDto {
	@ApiProperty({ example: 'Conduit & Raceway' })
	@IsString()
	@MinLength(2)
	@MaxLength(120)
	name!: string;

	@ApiPropertyOptional({ example: 'Optional parent category name or slug' })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	suggestedParent?: string;

	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	note?: string;
}