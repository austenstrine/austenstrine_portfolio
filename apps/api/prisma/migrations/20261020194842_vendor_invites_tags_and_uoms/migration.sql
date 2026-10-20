-- DropIndex
DROP INDEX "CatalogProduct_tags_idx";

-- AlterTable
ALTER TABLE "MarketplaceOrder" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "CatalogProduct_tags_idx" ON "CatalogProduct"("tags");
