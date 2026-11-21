-- Backfill missing emails, then require email going forward.
UPDATE "RoadmapSuggestion"
SET "email" = 'spoof@austenstrine.dev'
WHERE "email" IS NULL OR BTRIM("email") = '';

ALTER TABLE "RoadmapSuggestion"
ALTER COLUMN "email" SET NOT NULL;
