-- CreateEnum
CREATE TYPE "BreakFeeMode" AS ENUM ('OFF', 'PER_PARENT_OPENED', 'ONCE_PER_LINE', 'PRODUCT_ONCE');

-- Product break fees
ALTER TABLE "CatalogProduct" ADD COLUMN "breakFeeMode" "BreakFeeMode" NOT NULL DEFAULT 'OFF';
ALTER TABLE "CatalogProduct" ADD COLUMN "breakFeeCents" INTEGER NOT NULL DEFAULT 0;

-- Offering SKU + break controls
ALTER TABLE "ProductOffering" ADD COLUMN "sku" TEXT;
ALTER TABLE "ProductOffering" ADD COLUMN "minUnbrokenQty" DECIMAL(24,8) NOT NULL DEFAULT -1;
ALTER TABLE "ProductOffering" ADD COLUMN "breakPoolAboveQty" DECIMAL(24,8) NOT NULL DEFAULT 0;
ALTER TABLE "ProductOffering" ADD COLUMN "inheritQtyToChildren" BOOLEAN NOT NULL DEFAULT false;

UPDATE "ProductOffering" o
SET "sku" = p."sku" || '-' || LOWER(o."role"::text)
FROM "CatalogProduct" p
WHERE o."productId" = p."id" AND o."sku" IS NULL;

UPDATE "ProductOffering" o
SET "sku" = p."sku"
FROM "CatalogProduct" p
WHERE o."productId" = p."id"
  AND o."sku" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "ProductOffering" o2
    WHERE o2."productId" = p."id" AND o2."id" <> o."id"
  );

UPDATE "ProductOffering" SET "sku" = 'OFFERING-' || "id" WHERE "sku" IS NULL;

ALTER TABLE "ProductOffering" ALTER COLUMN "sku" SET NOT NULL;

CREATE UNIQUE INDEX "ProductOffering_productId_sku_key" ON "ProductOffering"("productId", "sku");
CREATE INDEX "ProductOffering_sku_idx" ON "ProductOffering"("sku");

-- Walkthrough-friendly defaults for existing pack rows linked to pieces
UPDATE "ProductOffering" o
SET "minUnbrokenQty" = 0,
    "inheritQtyToChildren" = true,
    "breakPoolAboveQty" = 0
WHERE o."role" = 'PACK'
  AND EXISTS (
    SELECT 1 FROM "PackPieceLink" l WHERE l."packOfferingId" = o."id"
  );

UPDATE "ProductOffering" o
SET "tracksOwnQty" = false,
    "qtyOnHand" = 0
FROM "PackPieceLink" l
WHERE l."pieceOfferingId" = o."id"
  AND EXISTS (
    SELECT 1 FROM "CatalogProduct" p
    WHERE p."id" = o."productId" AND p."inventoryFromAllocations" = true
  );

-- Rename PackPieceLink -> OfferingContainment
ALTER TABLE "PackPieceLink" RENAME TO "OfferingContainment";
ALTER TABLE "OfferingContainment" RENAME COLUMN "packOfferingId" TO "parentOfferingId";
ALTER TABLE "OfferingContainment" RENAME COLUMN "pieceOfferingId" TO "childOfferingId";
ALTER TABLE "OfferingContainment" RENAME COLUMN "pieceQtyPerPack" TO "childQtyPerParent";
ALTER TABLE "OfferingContainment" ADD COLUMN "breakFeeCents" INTEGER;

ALTER INDEX "PackPieceLink_pkey" RENAME TO "OfferingContainment_pkey";
ALTER INDEX "PackPieceLink_packOfferingId_pieceOfferingId_key" RENAME TO "OfferingContainment_parentOfferingId_childOfferingId_key";
ALTER INDEX "PackPieceLink_pieceOfferingId_idx" RENAME TO "OfferingContainment_childOfferingId_idx";

ALTER TABLE "OfferingContainment" RENAME CONSTRAINT "PackPieceLink_packOfferingId_fkey" TO "OfferingContainment_parentOfferingId_fkey";
ALTER TABLE "OfferingContainment" RENAME CONSTRAINT "PackPieceLink_pieceOfferingId_fkey" TO "OfferingContainment_childOfferingId_fkey";

-- Drop product-level SKU
DROP INDEX "CatalogProduct_vendorId_sku_key";
ALTER TABLE "CatalogProduct" DROP COLUMN "sku";
