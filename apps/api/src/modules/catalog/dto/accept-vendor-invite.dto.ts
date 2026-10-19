import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AcceptVendorInviteDto {
	@ApiProperty()
	@IsString()
	@MinLength(16)
	token!: string;
}