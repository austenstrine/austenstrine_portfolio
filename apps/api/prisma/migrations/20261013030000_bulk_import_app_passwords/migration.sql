-- CreateEnum
CREATE TYPE "CatalogImportSource" AS ENUM ('UI', 'API');

-- CreateEnum
CREATE TYPE "CatalogImportStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- AlterTable ProductOffering: add vendorId + offeringKey
ALTER TABLE "ProductOffering" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "ProductOffering" ADD COLUMN "offeringKey" TEXT NOT NULL DEFAULT 'default';

-- Backfill vendorId from product
UPDATE "ProductOffering" AS o
SET "vendorId" = p."vendorId"
FROM "CatalogProduct" AS p
WHERE o."productId" = p."id";

ALTER TABLE "ProductOffering" ALTER COLUMN "vendorId" SET NOT NULL;

-- Drop old unique on (productId, sku)
DROP INDEX IF EXISTS "ProductOffering_productId_sku_key";

-- CreateIndex
CREATE UNIQUE INDEX "ProductOffering_productId_sku_offeringKey_key" ON "ProductOffering"("productId", "sku", "offeringKey");
CREATE UNIQUE INDEX "ProductOffering_vendorId_sku_offeringKey_key" ON "ProductOffering"("vendorId", "sku", "offeringKey");
CREATE INDEX "ProductOffering_vendorId_idx" ON "ProductOffering"("vendorId");

-- AddForeignKey
ALTER TABLE "ProductOffering" ADD CONSTRAINT "ProductOffering_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable VendorAppPassword
CREATE TABLE "VendorAppPassword" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tokenPrefix" TEXT NOT NULL,
    "secretHash" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorAppPassword_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorAppPassword_secretHash_key" ON "VendorAppPassword"("secretHash");
CREATE INDEX "VendorAppPassword_vendorId_idx" ON "VendorAppPassword"("vendorId");
CREATE INDEX "VendorAppPassword_tokenPrefix_idx" ON "VendorAppPassword"("tokenPrefix");

ALTER TABLE "VendorAppPassword" ADD CONSTRAINT "VendorAppPassword_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorAppPassword" ADD CONSTRAINT "VendorAppPassword_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable CatalogImportJob
CREATE TABLE "CatalogImportJob" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "source" "CatalogImportSource" NOT NULL DEFAULT 'UI',
    "status" "CatalogImportStatus" NOT NULL DEFAULT 'PENDING',
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "CatalogImportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogImportJob_vendorId_createdAt_idx" ON "CatalogImportJob"("vendorId", "createdAt");
CREATE INDEX "CatalogImportJob_status_idx" ON "CatalogImportJob"("status");

ALTER TABLE "CatalogImportJob" ADD CONSTRAINT "CatalogImportJob_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogImportJob" ADD CONSTRAINT "CatalogImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
