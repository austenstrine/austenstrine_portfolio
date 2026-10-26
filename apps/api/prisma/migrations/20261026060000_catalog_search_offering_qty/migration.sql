-- availableQty is now in the catalog_products search document, so offering
-- qty changes must enqueue a reindex the same way price/sku changes do.

DROP TRIGGER IF EXISTS catalog_search_enqueue_update ON "ProductOffering";

CREATE TRIGGER catalog_search_enqueue_update
AFTER UPDATE OF sku, "offeringKey", role, "priceCents", currency, "uomId", "availableQty", "qtyOnHand"
ON "ProductOffering"
FOR EACH ROW EXECUTE FUNCTION catalog_search_enqueue();
