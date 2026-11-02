-- AlterTable
ALTER TABLE "UnitOfMeasure" ADD COLUMN "omitFromAvailability" BOOLEAN NOT NULL DEFAULT false;

-- Count-style UOMs: drop the unit token in availability copy ("16 available").
UPDATE "UnitOfMeasure"
SET "omitFromAvailability" = true
WHERE LOWER("code") IN ('ea', 'each', 'pk', 'pack', 'case');
