-- AlterTable
ALTER TABLE "Vendor" ADD COLUMN "isSuperVendor" BOOLEAN NOT NULL DEFAULT false;

-- At most one supervendor
CREATE UNIQUE INDEX "Vendor_isSuperVendor_true_key"
ON "Vendor" ("isSuperVendor")
WHERE "isSuperVendor" = true;

-- AlterTable
ALTER TABLE "CatalogProduct" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "CatalogProduct_tags_idx" ON "CatalogProduct" USING GIN ("tags");
