import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class DeleteCatalogProductsDto {
	@IsOptional()
	@IsArray()
	@IsUUID('4', { each: true })
	productIds?: string[];

	@IsOptional()
	@IsArray()
	@IsString({ each: true })
	productSlugs?: string[];
}
