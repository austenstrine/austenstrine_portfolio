-- Migrate STANDALONE offerings to PIECE before shrinking the enum.
UPDATE "ProductOffering" SET "role" = 'PIECE' WHERE "role" = 'STANDALONE';
UPDATE "ArchivedProductOffering" SET "role" = 'PIECE' WHERE "role" = 'STANDALONE';

-- Recreate ProductOfferingRole without STANDALONE (also used by ArchivedProductOffering).
CREATE TYPE "ProductOfferingRole_new" AS ENUM ('PACK', 'PIECE');
ALTER TABLE "ProductOffering"
	ALTER COLUMN "role" DROP DEFAULT,
	ALTER COLUMN "role" TYPE "ProductOfferingRole_new"
	USING ("role"::text::"ProductOfferingRole_new");
ALTER TABLE "ProductOffering" ALTER COLUMN "role" SET DEFAULT 'PIECE';
ALTER TABLE "ArchivedProductOffering"
	ALTER COLUMN "role" TYPE "ProductOfferingRole_new"
	USING ("role"::text::"ProductOfferingRole_new");
DROP TYPE "ProductOfferingRole";
ALTER TYPE "ProductOfferingRole_new" RENAME TO "ProductOfferingRole";

-- Normalized Attribute / AttributeValue (replaces pure EAV ProductAttribute).
CREATE TABLE "Attribute" (
	"id" TEXT NOT NULL,
	"name" TEXT NOT NULL,
	"vendorId" TEXT,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "Attribute_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributeValue" (
	"id" TEXT NOT NULL,
	"attributeId" TEXT NOT NULL,
	"value" TEXT NOT NULL,
	"vendorId" TEXT,
	"parentId" TEXT,
	"sortOrder" INTEGER NOT NULL DEFAULT 0,
	"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" TIMESTAMP(3) NOT NULL,
	CONSTRAINT "AttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductAttributeValue" (
	"id" TEXT NOT NULL,
	"productId" TEXT NOT NULL,
	"attributeValueId" TEXT NOT NULL,
	"sortOrder" INTEGER NOT NULL DEFAULT 0,
	CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attribute_vendorId_idx" ON "Attribute"("vendorId");
CREATE INDEX "Attribute_name_idx" ON "Attribute"("name");
CREATE UNIQUE INDEX "Attribute_global_name_key" ON "Attribute"("name") WHERE "vendorId" IS NULL;
CREATE UNIQUE INDEX "Attribute_vendor_name_key" ON "Attribute"("vendorId", "name") WHERE "vendorId" IS NOT NULL;

CREATE INDEX "AttributeValue_attributeId_idx" ON "AttributeValue"("attributeId");
CREATE INDEX "AttributeValue_vendorId_idx" ON "AttributeValue"("vendorId");
CREATE INDEX "AttributeValue_parentId_idx" ON "AttributeValue"("parentId");
CREATE INDEX "AttributeValue_attributeId_value_idx" ON "AttributeValue"("attributeId", "value");
CREATE UNIQUE INDEX "AttributeValue_global_attr_value_key"
	ON "AttributeValue"("attributeId", "value") WHERE "vendorId" IS NULL;
CREATE UNIQUE INDEX "AttributeValue_vendor_attr_value_key"
	ON "AttributeValue"("attributeId", "value", "vendorId") WHERE "vendorId" IS NOT NULL;

CREATE UNIQUE INDEX "ProductAttributeValue_productId_attributeValueId_key"
	ON "ProductAttributeValue"("productId", "attributeValueId");
CREATE INDEX "ProductAttributeValue_productId_idx" ON "ProductAttributeValue"("productId");
CREATE INDEX "ProductAttributeValue_attributeValueId_idx" ON "ProductAttributeValue"("attributeValueId");

ALTER TABLE "Attribute"
	ADD CONSTRAINT "Attribute_vendorId_fkey"
	FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AttributeValue"
	ADD CONSTRAINT "AttributeValue_attributeId_fkey"
	FOREIGN KEY ("attributeId") REFERENCES "Attribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttributeValue"
	ADD CONSTRAINT "AttributeValue_vendorId_fkey"
	FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttributeValue"
	ADD CONSTRAINT "AttributeValue_parentId_fkey"
	FOREIGN KEY ("parentId") REFERENCES "AttributeValue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProductAttributeValue"
	ADD CONSTRAINT "ProductAttributeValue_productId_fkey"
	FOREIGN KEY ("productId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductAttributeValue"
	ADD CONSTRAINT "ProductAttributeValue_attributeValueId_fkey"
	FOREIGN KEY ("attributeValueId") REFERENCES "AttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Best-effort migrate existing ProductAttribute EAV rows into the normalized tables.
DO $$
DECLARE
	row RECORD;
	attr_id TEXT;
	val_id TEXT;
BEGIN
	FOR row IN
		SELECT pa.*, p."vendorId" AS product_vendor_id
		FROM "ProductAttribute" pa
		JOIN "CatalogProduct" p ON p."id" = pa."productId"
	LOOP
		SELECT a."id" INTO attr_id
		FROM "Attribute" a
		WHERE a."name" = row."key" AND a."vendorId" IS NULL
		LIMIT 1;

		IF attr_id IS NULL THEN
			attr_id := gen_random_uuid()::text;
			INSERT INTO "Attribute" ("id", "name", "vendorId", "createdAt", "updatedAt")
			VALUES (attr_id, row."key", NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
		END IF;

		SELECT v."id" INTO val_id
		FROM "AttributeValue" v
		WHERE v."attributeId" = attr_id
			AND v."value" = row."value"
			AND v."vendorId" IS NULL
		LIMIT 1;

		IF val_id IS NULL THEN
			val_id := gen_random_uuid()::text;
			INSERT INTO "AttributeValue" (
				"id", "attributeId", "value", "vendorId", "parentId", "sortOrder", "createdAt", "updatedAt"
			)
			VALUES (
				val_id, attr_id, row."value", NULL, NULL, row."sortOrder", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
			);
		END IF;

		INSERT INTO "ProductAttributeValue" ("id", "productId", "attributeValueId", "sortOrder")
		VALUES (gen_random_uuid()::text, row."productId", val_id, row."sortOrder")
		ON CONFLICT ("productId", "attributeValueId") DO NOTHING;
	END LOOP;
END $$;

DROP TABLE "ProductAttribute";

-- Seed a small global Color attribute for the variants scaffold.
INSERT INTO "Attribute" ("id", "name", "vendorId", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'Color', NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (
	SELECT 1 FROM "Attribute" WHERE "name" = 'Color' AND "vendorId" IS NULL
);

INSERT INTO "AttributeValue" ("id", "attributeId", "value", "vendorId", "parentId", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, a."id", v."value", NULL, NULL, v."sortOrder", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Attribute" a
CROSS JOIN (
	VALUES
		('Black', 0),
		('White', 1),
		('Red', 2),
		('Green', 3),
		('Blue', 4)
) AS v("value", "sortOrder")
WHERE a."name" = 'Color' AND a."vendorId" IS NULL
	AND NOT EXISTS (
		SELECT 1
		FROM "AttributeValue" existing
		WHERE existing."attributeId" = a."id"
			AND existing."value" = v."value"
			AND existing."vendorId" IS NULL
	);
