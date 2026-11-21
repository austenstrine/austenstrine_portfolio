import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsEmail,
	IsOptional,
	IsString,
	MaxLength,
	MinLength,
} from 'class-validator';

export class CreateRoadmapSuggestionDto {
	@ApiProperty({
		description: 'Suggestion text',
		minLength: 8,
		maxLength: 2000,
	})
	@IsString()
	@MinLength(8)
	@MaxLength(2000)
	body!: string;

	@ApiPropertyOptional({ maxLength: 120 })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	name?: string;

	@ApiProperty({
		description: 'Email for status updates',
		maxLength: 254,
	})
	@IsEmail()
	@MaxLength(254)
	email!: string;

	/** Honeypot — leave empty. Non-empty submissions are silently dropped. */
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(200)
	website?: string;
}
