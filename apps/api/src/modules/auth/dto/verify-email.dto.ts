import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, Length, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty()
  @Length(6, 6)
  code!: string;
}
