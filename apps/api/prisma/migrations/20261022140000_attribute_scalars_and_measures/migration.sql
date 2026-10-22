-- CreateEnum
CREATE TYPE "ProductCondition" AS ENUM ('NEW', 'USED', 'REFURBISHED', 'NA');

-- CreateEnum
CREATE TYPE "AttributeValueKind" AS ENUM ('OPTION', 'SCALAR_STRING', 'SCALAR_NUMBER', 'SCALAR_BOOLEAN');

ALTER TABLE "Vendor" ADD COLUMN "maxCategoriesPerAttributeValue" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "CatalogProduct" ADD COLUMN "lengthNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "widthNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "heightNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "linearUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "weightNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "weightUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "packageLengthNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "packageWidthNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "packageHeightNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "packageLinearUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "packageWeightNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "packageWeightUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "volumeNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "volumeUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "netContentNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "netContentUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "piecesPerRetailUnit" INTEGER;
ALTER TABLE "CatalogProduct" ADD COLUMN "voltageNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "wattageNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "amperageNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "frequencyHzNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "capacityNumeric" DECIMAL(24,8);
ALTER TABLE "CatalogProduct" ADD COLUMN "capacityUnit" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "gtin" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "mpn" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "countryOfOrigin" TEXT;
ALTER TABLE "CatalogProduct" ADD COLUMN "condition" "ProductCondition" NOT NULL DEFAULT 'NA';
ALTER TABLE "CatalogProduct" ADD COLUMN "releaseAt" TIMESTAMP(3);
ALTER TABLE "CatalogProduct" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE INDEX "CatalogProduct_weightNumeric_idx" ON "CatalogProduct"("weightNumeric");
CREATE INDEX "CatalogProduct_voltageNumeric_idx" ON "CatalogProduct"("voltageNumeric");
CREATE INDEX "CatalogProduct_packageWeightNumeric_idx" ON "CatalogProduct"("packageWeightNumeric");

ALTER TABLE "Attribute" ADD COLUMN "valueKind" "AttributeValueKind" NOT NULL DEFAULT 'OPTION';
ALTER TABLE "Attribute" ADD COLUMN "unit" TEXT;
ALTER TABLE "Attribute" ADD COLUMN "minNumeric" DECIMAL(24,8);
ALTER TABLE "Attribute" ADD COLUMN "maxNumeric" DECIMAL(24,8);

ALTER TABLE "AttributeValue" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "AttributeValue" ADD COLUMN "groupId" TEXT;

CREATE INDEX "AttributeValue_vendorId_categoryId_idx" ON "AttributeValue"("vendorId", "categoryId");
CREATE INDEX "AttributeValue_groupId_idx" ON "AttributeValue"("groupId");
CREATE INDEX "AttributeValue_attributeId_parentId_idx" ON "AttributeValue"("attributeId", "parentId");

DROP INDEX IF EXISTS "AttributeValue_vendor_attr_value_key";
CREATE UNIQUE INDEX "AttributeValue_vendor_attr_value_category_key"
	ON "AttributeValue"("attributeId", "vendorId", "categoryId", "value")
	WHERE "vendorId" IS NOT NULL;
CREATE UNIQUE INDEX "AttributeValue_group_category_key"
	ON "AttributeValue"("groupId", "categoryId")
	WHERE "groupId" IS NOT NULL;

ALTER TABLE "AttributeValue"
	ADD CONSTRAINT "AttributeValue_categoryId_fkey"
	FOREIGN KEY ("categoryId") REFERENCES "CatalogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ProductScalarValue" (
	"id" TEXT NOT NULL,
	"productId" TEXT NOT NULL,
	"attributeId" TEXT NOT NULL,
	"stringValue" TEXT,
	"numericValue" DECIMAL(24,8),
	"booleanValue" BOOLEAN,
	CONSTRAINT "ProductScalarValue_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductScalarValue_productId_attributeId_key" ON "ProductScalarValue"("productId", "attributeId");
CREATE INDEX "ProductScalarValue_attributeId_numericValue_idx" ON "ProductScalarValue"("attributeId", "numericValue");
CREATE INDEX "ProductScalarValue_attributeId_stringValue_idx" ON "ProductScalarValue"("attributeId", "stringValue");
CREATE INDEX "ProductScalarValue_productId_idx" ON "ProductScalarValue"("productId");

ALTER TABLE "ProductScalarValue"
	ADD CONSTRAINT "ProductScalarValue_productId_fkey"
	FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductScalarValue"
	ADD CONSTRAINT "ProductScalarValue_attributeId_fkey"
	FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
