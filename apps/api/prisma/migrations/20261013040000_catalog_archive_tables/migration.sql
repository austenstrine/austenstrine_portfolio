-- CreateTable
CREATE TABLE "ArchivedCatalogProduct" (
    "id" TEXT NOT NULL,
    "archiveBatchId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "vendorSlug" TEXT NOT NULL,
    "categoryId" TEXT,
    "categorySlug" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL,
    "inventoryFromAllocations" BOOLEAN NOT NULL,
    "breakFeeMode" "BreakFeeMode" NOT NULL,
    "breakFeeCents" INTEGER NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedCatalogProduct_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivedCatalogProduct_archivedAt_idx" ON "ArchivedCatalogProduct"("archivedAt");
CREATE INDEX "ArchivedCatalogProduct_archiveBatchId_idx" ON "ArchivedCatalogProduct"("archiveBatchId");
CREATE INDEX "ArchivedCatalogProduct_vendorId_slug_idx" ON "ArchivedCatalogProduct"("vendorId", "slug");
CREATE INDEX "ArchivedCatalogProduct_originalId_idx" ON "ArchivedCatalogProduct"("originalId");

CREATE TABLE "ArchivedProductAttribute" (
    "id" TEXT NOT NULL,
    "archiveBatchId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalId" TEXT NOT NULL,
    "originalProductId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "ArchivedProductAttribute_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivedProductAttribute_archivedAt_idx" ON "ArchivedProductAttribute"("archivedAt");
CREATE INDEX "ArchivedProductAttribute_archiveBatchId_idx" ON "ArchivedProductAttribute"("archiveBatchId");
CREATE INDEX "ArchivedProductAttribute_originalProductId_idx" ON "ArchivedProductAttribute"("originalProductId");

CREATE TABLE "ArchivedProductOffering" (
    "id" TEXT NOT NULL,
    "archiveBatchId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalId" TEXT NOT NULL,
    "originalProductId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "offeringKey" TEXT NOT NULL,
    "uomId" TEXT NOT NULL,
    "uomCode" TEXT NOT NULL,
    "role" "ProductOfferingRole" NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "qtyOnHand" DECIMAL(24,8) NOT NULL,
    "availableQty" DECIMAL(24,8) NOT NULL,
    "tracksOwnQty" BOOLEAN NOT NULL,
    "minUnbrokenQty" DECIMAL(24,8) NOT NULL,
    "breakPoolAboveQty" DECIMAL(24,8) NOT NULL,
    "inheritQtyToChildren" BOOLEAN NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedProductOffering_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivedProductOffering_archivedAt_idx" ON "ArchivedProductOffering"("archivedAt");
CREATE INDEX "ArchivedProductOffering_archiveBatchId_idx" ON "ArchivedProductOffering"("archiveBatchId");
CREATE INDEX "ArchivedProductOffering_vendorId_sku_offeringKey_idx" ON "ArchivedProductOffering"("vendorId", "sku", "offeringKey");
CREATE INDEX "ArchivedProductOffering_originalId_idx" ON "ArchivedProductOffering"("originalId");

CREATE TABLE "ArchivedOfferingContainment" (
    "id" TEXT NOT NULL,
    "archiveBatchId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalId" TEXT NOT NULL,
    "originalParentOfferingId" TEXT NOT NULL,
    "originalChildOfferingId" TEXT NOT NULL,
    "parentSku" TEXT NOT NULL,
    "parentOfferingKey" TEXT NOT NULL,
    "childSku" TEXT NOT NULL,
    "childOfferingKey" TEXT NOT NULL,
    "childQtyPerParent" DECIMAL(24,8) NOT NULL,
    "breakFeeCents" INTEGER,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedOfferingContainment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivedOfferingContainment_archivedAt_idx" ON "ArchivedOfferingContainment"("archivedAt");
CREATE INDEX "ArchivedOfferingContainment_archiveBatchId_idx" ON "ArchivedOfferingContainment"("archiveBatchId");

CREATE TABLE "ArchivedBrokenPack" (
    "id" TEXT NOT NULL,
    "archiveBatchId" TEXT NOT NULL,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalId" TEXT NOT NULL,
    "originalPackOfferingId" TEXT NOT NULL,
    "packSku" TEXT NOT NULL,
    "packOfferingKey" TEXT NOT NULL,
    "label" TEXT,
    "remainingQty" DECIMAL(24,8) NOT NULL,
    "status" "BrokenPackStatus" NOT NULL,
    "originalCreatedAt" TIMESTAMP(3) NOT NULL,
    "originalUpdatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArchivedBrokenPack_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ArchivedBrokenPack_archivedAt_idx" ON "ArchivedBrokenPack"("archivedAt");
CREATE INDEX "ArchivedBrokenPack_archiveBatchId_idx" ON "ArchivedBrokenPack"("archiveBatchId");
