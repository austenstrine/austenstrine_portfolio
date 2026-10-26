-- NEW/OLD field names are table-specific; to_jsonb avoids "record has no field productId"
-- when the same trigger function runs on Attribute, Vendor, etc.

CREATE OR REPLACE FUNCTION catalog_search_enqueue() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
	rec_id text;
	product_id text;
	payload jsonb;
BEGIN
	IF TG_OP = 'DELETE' THEN
		payload := to_jsonb(OLD);
	ELSE
		payload := to_jsonb(NEW);
	END IF;

	rec_id := payload->>'id';
	product_id := payload->>'productId';

	INSERT INTO "CatalogSearchOutbox" ("id", "tableName", "op", "rowId", "productId", "createdAt")
	VALUES (gen_random_uuid()::text, TG_TABLE_NAME, TG_OP, rec_id, product_id, CURRENT_TIMESTAMP);

	RETURN COALESCE(NEW, OLD);
END;
$$;
