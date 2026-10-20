-- Rename MarketplaceOrder to PlaceEtMarqueOrder in place so existing orders are kept.

-- AlterEnum
ALTER TYPE "MarketplaceOrderStatus" RENAME TO "PlaceEtMarqueOrderStatus";

-- AlterTable
ALTER TABLE "MarketplaceOrder" RENAME TO "PlaceEtMarqueOrder";
ALTER TABLE "PlaceEtMarqueOrder" RENAME CONSTRAINT "MarketplaceOrder_pkey" TO "PlaceEtMarqueOrder_pkey";

-- RenameForeignKey
ALTER TABLE "PlaceEtMarqueOrder" RENAME CONSTRAINT "MarketplaceOrder_buyerId_fkey" TO "PlaceEtMarqueOrder_buyerId_fkey";
ALTER TABLE "PlaceEtMarqueOrder" RENAME CONSTRAINT "MarketplaceOrder_vendorId_fkey" TO "PlaceEtMarqueOrder_vendorId_fkey";
ALTER TABLE "PlaceEtMarqueOrder" RENAME CONSTRAINT "MarketplaceOrder_checkoutId_fkey" TO "PlaceEtMarqueOrder_checkoutId_fkey";
ALTER TABLE "PlaceEtMarqueOrder" RENAME CONSTRAINT "MarketplaceOrder_checkoutShipmentId_fkey" TO "PlaceEtMarqueOrder_checkoutShipmentId_fkey";
ALTER TABLE "PlaceEtMarqueOrder" RENAME CONSTRAINT "MarketplaceOrder_shippingProfileId_fkey" TO "PlaceEtMarqueOrder_shippingProfileId_fkey";

-- RenameIndex
ALTER INDEX "MarketplaceOrder_orderRef_key" RENAME TO "PlaceEtMarqueOrder_orderRef_key";
ALTER INDEX "MarketplaceOrder_checkoutShipmentId_key" RENAME TO "PlaceEtMarqueOrder_checkoutShipmentId_key";
ALTER INDEX "MarketplaceOrder_buyerId_createdAt_idx" RENAME TO "PlaceEtMarqueOrder_buyerId_createdAt_idx";
ALTER INDEX "MarketplaceOrder_vendorId_status_idx" RENAME TO "PlaceEtMarqueOrder_vendorId_status_idx";
ALTER INDEX "MarketplaceOrder_checkoutId_idx" RENAME TO "PlaceEtMarqueOrder_checkoutId_idx";
