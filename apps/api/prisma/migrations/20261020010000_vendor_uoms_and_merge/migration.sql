-- CreateEnum
CREATE TYPE "UomMergePolicyStatus" AS ENUM ('SKIP_ONCE', 'SKIP_FOREVER', 'MERGED');

-- DropIndex
DROP INDEX IF EXISTS "UnitOfMeasure_code_key";

-- AlterTable
ALTER TABLE "UnitOfMeasure" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "UnitOfMeasure" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE INDEX "UnitOfMeasure_vendorId_idx" ON "UnitOfMeasure"("vendorId");
CREATE INDEX "UnitOfMeasure_code_idx" ON "UnitOfMeasure"("code");

-- Globals keep unique codes; vendor rows unique per (vendorId, code)
CREATE UNIQUE INDEX "UnitOfMeasure_global_code_key"
ON "UnitOfMeasure" ("code")
WHERE "vendorId" IS NULL;

CREATE UNIQUE INDEX "UnitOfMeasure_vendor_code_key"
ON "UnitOfMeasure" ("vendorId", "code")
WHERE "vendorId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "UnitOfMeasure" ADD CONSTRAINT "UnitOfMeasure_vendorId_fkey"
FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UomMergePolicy" (
    "id" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "status" "UomMergePolicyStatus" NOT NULL,
    "lastNotifiedUomIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UomMergePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UomMergePolicy_nameKey_key" ON "UomMergePolicy"("nameKey");
