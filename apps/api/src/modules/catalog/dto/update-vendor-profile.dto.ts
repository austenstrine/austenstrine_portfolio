import { ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsEmail,
	IsOptional,
	IsString,
	IsUrl,
	MaxLength,
	ValidateIf,
} from 'class-validator';

/**
 * Public storefront fields sellers can edit.
 * Empty string clears a field (stored as null).
 */
export class UpdateVendorProfileDto {
	@ApiPropertyOptional({ maxLength: 160 })
	@IsOptional()
	@IsString()
	@MaxLength(160)
	tagline?: string | null;

	@ApiPropertyOptional({ maxLength: 5000 })
	@IsOptional()
	@IsString()
	@MaxLength(5000)
	about?: string | null;

	@ApiPropertyOptional({ maxLength: 120 })
	@IsOptional()
	@IsString()
	@MaxLength(120)
	locationLabel?: string | null;

	@ApiPropertyOptional()
	@IsOptional()
	@ValidateIf((_, value) => value !== null && value !== undefined && String(value).trim() !== '')
	@IsEmail()
	@MaxLength(254)
	contactEmail?: string | null;

	@ApiPropertyOptional({ maxLength: 40 })
	@IsOptional()
	@IsString()
	@MaxLength(40)
	contactPhone?: string | null;

	@ApiPropertyOptional()
	@IsOptional()
	@ValidateIf((_, value) => value !== null && value !== undefined && String(value).trim() !== '')
	@IsUrl({ require_protocol: true })
	@MaxLength(500)
	websiteUrl?: string | null;
}
