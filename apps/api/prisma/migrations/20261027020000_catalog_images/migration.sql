ALTER TABLE "CatalogCategory" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
