-- CreateEnum
CREATE TYPE "PayoutTrigger" AS ENUM ('ON_PAYMENT', 'ON_SHIPMENT');
CREATE TYPE "VendorPayoutStatus" AS ENUM ('PENDING', 'READY', 'TRANSFERRED', 'FAILED', 'SKIPPED');

-- AlterTable Vendor
ALTER TABLE "Vendor" ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Vendor" ADD COLUMN "stripeOnboardingCompleteAt" TIMESTAMP(3);
ALTER TABLE "Vendor" ADD COLUMN "platformFeeBpsOverride" INTEGER;
CREATE INDEX "Vendor_stripeConnectAccountId_idx" ON "Vendor"("stripeConnectAccountId");

-- AlterTable ShippingProfile
ALTER TABLE "ShippingProfile" ADD COLUMN "payoutTrigger" "PayoutTrigger" NOT NULL DEFAULT 'ON_PAYMENT';
UPDATE "ShippingProfile" SET "payoutTrigger" = 'ON_SHIPMENT' WHERE "shipsSeparately" = true OR "code" = 'FREIGHT';

-- AlterTable MarketplaceOrder
ALTER TABLE "MarketplaceOrder" ADD COLUMN "feeCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "vendorNetCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "payoutTrigger" "PayoutTrigger" NOT NULL DEFAULT 'ON_PAYMENT';

-- CreateTable PlatformFeeConfig
CREATE TABLE "PlatformFeeConfig" (
    "id" TEXT NOT NULL,
    "merchandiseFeeBps" INTEGER NOT NULL DEFAULT 1000,
    "flatFeeCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformFeeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable VendorPayout
CREATE TABLE "VendorPayout" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "checkoutId" TEXT,
    "merchandiseCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL,
    "vendorNetCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "VendorPayoutStatus" NOT NULL DEFAULT 'PENDING',
    "trigger" "PayoutTrigger" NOT NULL,
    "stripeTransferId" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "readyAt" TIMESTAMP(3),
    "transferredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorPayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VendorPayout_orderId_key" ON "VendorPayout"("orderId");
CREATE INDEX "VendorPayout_vendorId_status_idx" ON "VendorPayout"("vendorId", "status");
CREATE INDEX "VendorPayout_status_readyAt_idx" ON "VendorPayout"("status", "readyAt");
CREATE INDEX "VendorPayout_checkoutId_idx" ON "VendorPayout"("checkoutId");

ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorPayout" ADD CONSTRAINT "VendorPayout_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
