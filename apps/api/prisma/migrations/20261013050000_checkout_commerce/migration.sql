-- CreateEnum
CREATE TYPE "CheckoutStatus" AS ENUM ('OPEN', 'AWAITING_PAYMENT', 'PAID', 'FAILED', 'EXPIRED');
CREATE TYPE "MarketplaceOrderStatus" AS ENUM ('HOLD', 'PAID', 'FULFILLING', 'SHIPPED', 'CANCELLED');

-- AlterTable Vendor
ALTER TABLE "Vendor" ADD COLUMN "stripeConnectAccountId" TEXT;

-- CreateTable ShippingProfile
CREATE TABLE "ShippingProfile" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shipsSeparately" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingProfile_vendorId_code_key" ON "ShippingProfile"("vendorId", "code");
CREATE INDEX "ShippingProfile_vendorId_idx" ON "ShippingProfile"("vendorId");
ALTER TABLE "ShippingProfile" ADD CONSTRAINT "ShippingProfile_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable ShippingRate
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "minSubtotalCents" INTEGER,
    "maxSubtotalCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShippingRate_profileId_idx" ON "ShippingRate"("profileId");
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ShippingProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable CatalogProduct
ALTER TABLE "CatalogProduct" ADD COLUMN "shippingProfileId" TEXT;
CREATE INDEX "CatalogProduct_shippingProfileId_idx" ON "CatalogProduct"("shippingProfileId");
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable Cart
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Cart_buyerId_key" ON "Cart"("buyerId");
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CartLine" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CartLine_cartId_offeringId_key" ON "CartLine"("cartId", "offeringId");
CREATE INDEX "CartLine_offeringId_idx" ON "CartLine"("offeringId");
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartLine" ADD CONSTRAINT "CartLine_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProductOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Checkout
CREATE TABLE "Checkout" (
    "id" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "status" "CheckoutStatus" NOT NULL DEFAULT 'OPEN',
    "stripePaymentIntentId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "merchandiseCents" INTEGER NOT NULL DEFAULT 0,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Checkout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Checkout_stripePaymentIntentId_key" ON "Checkout"("stripePaymentIntentId");
CREATE INDEX "Checkout_buyerId_createdAt_idx" ON "Checkout"("buyerId", "createdAt");
CREATE INDEX "Checkout_status_expiresAt_idx" ON "Checkout"("status", "expiresAt");
ALTER TABLE "Checkout" ADD CONSTRAINT "Checkout_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CheckoutShipment" (
    "id" TEXT NOT NULL,
    "checkoutId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "shippingProfileId" TEXT NOT NULL,
    "selectedRateId" TEXT,
    "selectedRateLabel" TEXT,
    "shippingCents" INTEGER NOT NULL DEFAULT 0,
    "merchandiseCents" INTEGER NOT NULL DEFAULT 0,
    "shipName" TEXT,
    "shipLine1" TEXT,
    "shipLine2" TEXT,
    "shipCity" TEXT,
    "shipRegion" TEXT,
    "shipPostal" TEXT,
    "shipCountry" TEXT DEFAULT 'US',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckoutShipment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckoutShipment_checkoutId_idx" ON "CheckoutShipment"("checkoutId");
CREATE INDEX "CheckoutShipment_vendorId_idx" ON "CheckoutShipment"("vendorId");
ALTER TABLE "CheckoutShipment" ADD CONSTRAINT "CheckoutShipment_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckoutShipment" ADD CONSTRAINT "CheckoutShipment_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckoutShipment" ADD CONSTRAINT "CheckoutShipment_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "CheckoutLine" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "offeringKeySnapshot" TEXT NOT NULL,

    CONSTRAINT "CheckoutLine_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckoutLine_shipmentId_idx" ON "CheckoutLine"("shipmentId");
CREATE INDEX "CheckoutLine_offeringId_idx" ON "CheckoutLine"("offeringId");
ALTER TABLE "CheckoutLine" ADD CONSTRAINT "CheckoutLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "CheckoutShipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CheckoutLine" ADD CONSTRAINT "CheckoutLine_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProductOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Evolve MarketplaceOrder
ALTER TABLE "MarketplaceOrder" ADD COLUMN "vendorId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "checkoutId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "checkoutShipmentId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shippingProfileId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "status" "MarketplaceOrderStatus" NOT NULL DEFAULT 'HOLD';
ALTER TABLE "MarketplaceOrder" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE "MarketplaceOrder" ADD COLUMN "merchandiseCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shippingCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "totalCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shippingLabel" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipName" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipLine1" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipLine2" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipCity" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipRegion" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipPostal" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shipCountry" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "stripeTransferId" TEXT;
ALTER TABLE "MarketplaceOrder" ADD COLUMN "shippedAt" TIMESTAMP(3);
ALTER TABLE "MarketplaceOrder" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "MarketplaceOrder_checkoutShipmentId_key" ON "MarketplaceOrder"("checkoutShipmentId");
CREATE INDEX "MarketplaceOrder_buyerId_createdAt_idx" ON "MarketplaceOrder"("buyerId", "createdAt");
CREATE INDEX "MarketplaceOrder_vendorId_status_idx" ON "MarketplaceOrder"("vendorId", "status");
CREATE INDEX "MarketplaceOrder_checkoutId_idx" ON "MarketplaceOrder"("checkoutId");

ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_checkoutId_fkey" FOREIGN KEY ("checkoutId") REFERENCES "Checkout"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_checkoutShipmentId_fkey" FOREIGN KEY ("checkoutShipmentId") REFERENCES "CheckoutShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceOrder" ADD CONSTRAINT "MarketplaceOrder_shippingProfileId_fkey" FOREIGN KEY ("shippingProfileId") REFERENCES "ShippingProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable OrderLine
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "titleSnapshot" TEXT NOT NULL,
    "skuSnapshot" TEXT NOT NULL,
    "offeringKeySnapshot" TEXT NOT NULL,
    "claimId" TEXT,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderLine_claimId_key" ON "OrderLine"("claimId");
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");
CREATE INDEX "OrderLine_offeringId_idx" ON "OrderLine"("offeringId");
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProductOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "InventoryClaim"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default shipping profiles are ensured in application code when vendors are used.