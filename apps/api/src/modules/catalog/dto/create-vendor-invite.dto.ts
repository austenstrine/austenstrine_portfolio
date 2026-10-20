import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { VendorMemberRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

export class CreateVendorInviteDto {
	@ApiProperty({ example: 'teammate@example.com' })
	@IsEmail()
	email!: string;

	@ApiPropertyOptional({ enum: [VendorMemberRole.EDITOR, VendorMemberRole.VIEWER] })
	@IsOptional()
	@IsEnum(VendorMemberRole)
	role?: VendorMemberRole;
}
