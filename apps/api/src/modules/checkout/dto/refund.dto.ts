import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class RefundOrderDto {
	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;

	@IsOptional()
	@IsBoolean()
	asCancel?: boolean;
}
