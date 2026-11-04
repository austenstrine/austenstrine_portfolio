-- CreateEnum
CREATE TYPE "VendorLinkNameRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DENIED', 'CANCELLED');

-- CreateTable
CREATE TABLE "VendorLinkNameRequest" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "requestedSlug" TEXT NOT NULL,
    "currentSlug" TEXT NOT NULL,
    "status" "VendorLinkNameRequestStatus" NOT NULL DEFAULT 'PENDING',
    "requesterNote" TEXT,
    "reviewReason" TEXT,
    "requestedByUserId" TEXT NOT NULL,
    "reviewedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "VendorLinkNameRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VendorLinkNameRequest_vendorId_status_idx" ON "VendorLinkNameRequest"("vendorId", "status");

-- CreateIndex
CREATE INDEX "VendorLinkNameRequest_status_createdAt_idx" ON "VendorLinkNameRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "VendorLinkNameRequest_requestedSlug_idx" ON "VendorLinkNameRequest"("requestedSlug");

-- AddForeignKey
ALTER TABLE "VendorLinkNameRequest" ADD CONSTRAINT "VendorLinkNameRequest_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ensure every vendor has a stable non-empty slug (already required; normalize casing/hyphens).
UPDATE "Vendor"
SET "slug" = LOWER(TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER("slug"), '[^a-z0-9]+', '-', 'g')))
WHERE "slug" IS NOT NULL AND "slug" <> '';
