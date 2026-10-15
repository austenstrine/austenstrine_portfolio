import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @MinLength(10)
  @MaxLength(128)
  @Matches(PASSWORD_PATTERN, {
    message: 'Password must include an uppercase letter, a lowercase letter, a number, and a symbol.',
  })
  password!: string;
}
