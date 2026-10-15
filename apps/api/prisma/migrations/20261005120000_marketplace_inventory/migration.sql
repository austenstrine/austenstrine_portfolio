-- CreateEnum
CREATE TYPE "VendorMemberRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');
CREATE TYPE "ProductOfferingRole" AS ENUM ('STANDALONE', 'PACK', 'PIECE');
CREATE TYPE "BrokenPackStatus" AS ENUM ('ACTIVE', 'DEPLETED');
CREATE TYPE "InventoryClaimStatus" AS ENUM ('PENDING', 'FULFILLED', 'RELEASED');
CREATE TYPE "InventoryTrimStrategy" AS ENUM ('WHOLE_UNITS_FIRST', 'SMALLEST_REMAINDER_FIRST', 'LARGEST_REMAINDER_FIRST');

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VendorMember" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "VendorMemberRole" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UnitOfMeasure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "dimensionKey" TEXT NOT NULL,
    "factorToReference" DECIMAL(24,8) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitOfMeasure_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "categoryId" TEXT,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "inventoryFromAllocations" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOffering" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "role" "ProductOfferingRole" NOT NULL DEFAULT 'STANDALONE',
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "qtyOnHand" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "availableQty" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "tracksOwnQty" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductOffering_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PackPieceLink" (
    "id" TEXT NOT NULL,
    "packOfferingId" TEXT NOT NULL,
    "pieceOfferingId" TEXT NOT NULL,
    "pieceQtyPerPack" DECIMAL(24,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackPieceLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BrokenPack" (
    "id" TEXT NOT NULL,
    "packOfferingId" TEXT NOT NULL,
    "label" TEXT,
    "remainingQty" DECIMAL(24,8) NOT NULL,
    "status" "BrokenPackStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrokenPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceOrder" (
    "id" TEXT NOT NULL,
    "orderRef" TEXT NOT NULL,
    "buyerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketplaceOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InventoryClaim" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "brokenPackId" TEXT,
    "quantity" DECIMAL(24,8) NOT NULL,
    "quantityInPieceUom" DECIMAL(24,8),
    "status" "InventoryClaimStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_slug_key" ON "Vendor"("slug");
CREATE INDEX "Vendor_name_idx" ON "Vendor"("name");
CREATE UNIQUE INDEX "VendorMember_vendorId_userId_key" ON "VendorMember"("vendorId", "userId");
CREATE INDEX "VendorMember_userId_idx" ON "VendorMember"("userId");
CREATE UNIQUE INDEX "UnitOfMeasure_code_key" ON "UnitOfMeasure"("code");
CREATE UNIQUE INDEX "CatalogCategory_slug_key" ON "CatalogCategory"("slug");
CREATE INDEX "CatalogCategory_parentId_idx" ON "CatalogCategory"("parentId");
CREATE UNIQUE INDEX "CatalogProduct_vendorId_sku_key" ON "CatalogProduct"("vendorId", "sku");
CREATE UNIQUE INDEX "CatalogProduct_vendorId_slug_key" ON "CatalogProduct"("vendorId", "slug");
CREATE INDEX "CatalogProduct_categoryId_idx" ON "CatalogProduct"("categoryId");
CREATE INDEX "CatalogProduct_active_idx" ON "CatalogProduct"("active");
CREATE INDEX "CatalogProduct_title_idx" ON "CatalogProduct"("title");
CREATE UNIQUE INDEX "ProductAttribute_productId_key_key" ON "ProductAttribute"("productId", "key");
CREATE INDEX "ProductAttribute_productId_idx" ON "ProductAttribute"("productId");
CREATE UNIQUE INDEX "ProductOffering_productId_uomId_role_key" ON "ProductOffering"("productId", "uomId", "role");
CREATE INDEX "ProductOffering_productId_idx" ON "ProductOffering"("productId");
CREATE INDEX "ProductOffering_role_idx" ON "ProductOffering"("role");
CREATE UNIQUE INDEX "PackPieceLink_packOfferingId_pieceOfferingId_key" ON "PackPieceLink"("packOfferingId", "pieceOfferingId");
CREATE INDEX "PackPieceLink_pieceOfferingId_idx" ON "PackPieceLink"("pieceOfferingId");
CREATE INDEX "BrokenPack_packOfferingId_status_idx" ON "BrokenPack"("packOfferingId", "status");
CREATE UNIQUE INDEX "MarketplaceOrder_orderRef_key" ON "MarketplaceOrder"("orderRef");
CREATE INDEX "InventoryClaim_orderId_idx" ON "InventoryClaim"("orderId");
CREATE INDEX "InventoryClaim_offeringId_status_idx" ON "InventoryClaim"("offeringId", "status");
CREATE INDEX "InventoryClaim_brokenPackId_idx" ON "InventoryClaim"("brokenPackId");

-- AddForeignKey
ALTER TABLE "VendorMember" ADD CONSTRAINT "VendorMember_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VendorMember" ADD CONSTRAINT "VendorMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogCategory" ADD CONSTRAINT "CatalogCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "CatalogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CatalogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductAttribute" ADD CONSTRAINT "ProductAttribute_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOffering" ADD CONSTRAINT "ProductOffering_productId_fkey" FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductOffering" ADD CONSTRAINT "ProductOffering_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "UnitOfMeasure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PackPieceLink" ADD CONSTRAINT "PackPieceLink_packOfferingId_fkey" FOREIGN KEY ("packOfferingId") REFERENCES "ProductOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PackPieceLink" ADD CONSTRAINT "PackPieceLink_pieceOfferingId_fkey" FOREIGN KEY ("pieceOfferingId") REFERENCES "ProductOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BrokenPack" ADD CONSTRAINT "BrokenPack_packOfferingId_fkey" FOREIGN KEY ("packOfferingId") REFERENCES "ProductOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryClaim" ADD CONSTRAINT "InventoryClaim_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "MarketplaceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryClaim" ADD CONSTRAINT "InventoryClaim_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "ProductOffering"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryClaim" ADD CONSTRAINT "InventoryClaim_brokenPackId_fkey" FOREIGN KEY ("brokenPackId") REFERENCES "BrokenPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
