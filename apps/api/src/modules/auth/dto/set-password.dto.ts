import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
	IsOptional,
	IsString,
	Matches,
	MaxLength,
	MinLength,
} from 'class-validator';
import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_PATTERN,
	PASSWORD_PATTERN_MESSAGE,
} from '../password-rules';

export class SetPasswordDto {
	@ApiPropertyOptional()
	@IsOptional()
	@IsString()
	@MaxLength(PASSWORD_MAX_LENGTH)
	currentPassword?: string;

	@ApiProperty()
	@MinLength(PASSWORD_MIN_LENGTH)
	@MaxLength(PASSWORD_MAX_LENGTH)
	@Matches(PASSWORD_PATTERN, {
		message: PASSWORD_PATTERN_MESSAGE,
	})
	password!: string;
}
