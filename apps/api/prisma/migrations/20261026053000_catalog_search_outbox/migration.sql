-- Durable catalog change queue. Table triggers enqueue a row for every
-- insert/update/delete; the API drains this into OpenSearch. App call sites
-- do not need their own index hooks.

CREATE TABLE "CatalogSearchOutbox" (
    "id" TEXT NOT NULL,
    "tableName" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogSearchOutbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogSearchOutbox_createdAt_idx" ON "CatalogSearchOutbox"("createdAt");

CREATE OR REPLACE FUNCTION catalog_search_enqueue() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	rec_id text;
	product_id text;
BEGIN
	IF TG_OP = 'DELETE' THEN
		rec_id := OLD.id::text;
		product_id := CASE TG_TABLE_NAME
			WHEN 'ProductAttributeValue' THEN OLD."productId"::text
			WHEN 'ProductScalarValue' THEN OLD."productId"::text
			WHEN 'ProductOffering' THEN OLD."productId"::text
			ELSE NULL
		END;
	ELSE
		rec_id := NEW.id::text;
		product_id := CASE TG_TABLE_NAME
			WHEN 'ProductAttributeValue' THEN NEW."productId"::text
			WHEN 'ProductScalarValue' THEN NEW."productId"::text
			WHEN 'ProductOffering' THEN NEW."productId"::text
			ELSE NULL
		END;
	END IF;

	INSERT INTO "CatalogSearchOutbox" ("id", "tableName", "op", "rowId", "productId", "createdAt")
	VALUES (gen_random_uuid()::text, TG_TABLE_NAME, TG_OP, rec_id, product_id, CURRENT_TIMESTAMP);

	RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "CatalogProduct"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "Attribute"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "AttributeValue"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "ProductAttributeValue"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "ProductScalarValue"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR DELETE ON "ProductOffering"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

-- Skip qty/availability churn; those fields are not in the search document.
CREATE TRIGGER catalog_search_enqueue_update
AFTER UPDATE OF sku, "offeringKey", role, "priceCents", currency, "uomId" ON "ProductOffering"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "Vendor"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();

CREATE TRIGGER catalog_search_enqueue
AFTER INSERT OR UPDATE OR DELETE ON "CatalogCategory"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();
