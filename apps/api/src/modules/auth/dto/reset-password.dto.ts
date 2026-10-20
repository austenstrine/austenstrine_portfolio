import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length, Matches, MaxLength, MinLength } from 'class-validator';
import {
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	PASSWORD_PATTERN,
	PASSWORD_PATTERN_MESSAGE,
} from '../password-rules';

export class ResetPasswordDto {
	@ApiProperty()
	@IsEmail()
	@MaxLength(254)
	email!: string;

	@ApiProperty()
	@Length(6, 6)
	code!: string;

	@ApiProperty()
	@MinLength(PASSWORD_MIN_LENGTH)
	@MaxLength(PASSWORD_MAX_LENGTH)
	@Matches(PASSWORD_PATTERN, {
		message: PASSWORD_PATTERN_MESSAGE,
	})
	password!: string;
}
