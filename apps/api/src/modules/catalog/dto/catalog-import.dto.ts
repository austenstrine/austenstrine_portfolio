import { IsOptional, IsString, MinLength } from 'class-validator';

export class CatalogImportBodyDto {
	@IsString()
	@MinLength(1)
	csv!: string;

	@IsOptional()
	@IsString()
	source?: 'UI' | 'API';
}
