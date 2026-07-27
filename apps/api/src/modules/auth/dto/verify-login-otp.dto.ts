import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class VerifyLoginOtpDto {
  @ApiProperty({ description: 'Pending session token returned by POST /auth/login' })
  @IsString()
  pendingToken!: string;

  @ApiProperty()
  @Length(6, 6)
  code!: string;
}
