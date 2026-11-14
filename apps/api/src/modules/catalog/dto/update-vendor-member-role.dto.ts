import { ApiProperty } from '@nestjs/swagger';
import { VendorMemberRole } from '@prisma/client';
import { IsIn } from 'class-validator';

export class UpdateVendorMemberRoleDto {
	@ApiProperty({ enum: [VendorMemberRole.EDITOR, VendorMemberRole.VIEWER] })
	@IsIn([VendorMemberRole.EDITOR, VendorMemberRole.VIEWER])
	role!: VendorMemberRole;
}
