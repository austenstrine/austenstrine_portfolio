-- CreateEnum
CREATE TYPE "OrderRefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "OrderRefundReason" AS ENUM ('BUYER_CANCEL', 'VENDOR_CANCEL', 'VENDOR_REFUND');

-- AlterEnum MarketplaceOrderStatus
ALTER TYPE "MarketplaceOrderStatus" ADD VALUE 'REFUNDED';

-- AlterEnum VendorPayoutStatus
ALTER TYPE "VendorPayoutStatus" ADD VALUE 'CANCELLED';
ALTER TYPE "VendorPayoutStatus" ADD VALUE 'REVERSED';

-- AlterTable Checkout
ALTER TABLE "Checkout" ADD COLUMN "refundedCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable MarketplaceOrder
ALTER TABLE "MarketplaceOrder" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceOrder" ADD COLUMN "cancelledAt" TIMESTAMP(3);

-- AlterTable VendorPayout
ALTER TABLE "VendorPayout" ADD COLUMN "stripeTransferReversalId" TEXT;
ALTER TABLE "VendorPayout" ADD COLUMN "reversedAt" TIMESTAMP(3);

-- CreateTable OrderRefund
CREATE TABLE "OrderRefund" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "checkoutId" TEXT,
    "initiatedByUserId" TEXT,
    "reason" "OrderRefundReason" NOT NULL,
    "note" TEXT,
    "status" "OrderRefundStatus" NOT NULL DEFAULT 'PENDING',
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "merchandiseCents" INTEGER NOT NULL,
    "shippingCents" INTEGER NOT NULL,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "buyerRefundCents" INTEGER NOT NULL,
    "vendorReversalCents" INTEGER NOT NULL DEFAULT 0,
    "stripeRefundId" TEXT,
    "stripeTransferReversalId" TEXT,
    "lastError" TEXT,
    "succeededAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderRefund_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderRefund_orderId_status_idx" ON "OrderRefund"("orderId", "status");
CREATE INDEX "OrderRefund_checkoutId_idx" ON "OrderRefund"("checkoutId");
CREATE INDEX "OrderRefund_initiatedByUserId_idx" ON "OrderRefund"("initiatedByUserId");

ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderRefund" ADD CONSTRAINT "OrderRefund_initiatedByUserId_fkey" FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
