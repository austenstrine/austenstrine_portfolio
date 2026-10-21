import { IsOptional, IsString } from 'class-validator';

export class QtyCompoundDto {
	@IsOptional()
	@IsString()
	major?: string;

	@IsOptional()
	@IsString()
	minor?: string;

	@IsOptional()
	@IsString()
	fraction?: string;
}
