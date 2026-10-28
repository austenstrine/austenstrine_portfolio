import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

function emptyToUndefined({ value }: { value: unknown }) {
	if(value === '' || value == null) {
		return undefined;
	}
	return value;
}

export class UploadCatalogMediaDto {
	@Transform(emptyToUndefined)
	@IsOptional()
	@IsIn(['product', 'category'])
	kind?: 'product' | 'category';

	@Transform(emptyToUndefined)
	@IsOptional()
	@IsUUID()
	productId?: string;

	@Transform(emptyToUndefined)
	@IsOptional()
	@IsUUID()
	categoryId?: string;

	@Transform(emptyToUndefined)
	@IsOptional()
	@IsUUID()
	vendorId?: string;

	@Transform(emptyToUndefined)
	@IsOptional()
	@IsString()
	@MaxLength(160)
	alt?: string;
}

export class UpdateCatalogCategoryDto {
	@IsOptional()
	@IsString()
	@MaxLength(500)
	imageUrl?: string | null;
}
