-- CreateEnum
CREATE TYPE "RoadmapSuggestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "RoadmapSuggestion"
ADD COLUMN "status" "RoadmapSuggestionStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "reviewReason" TEXT,
ADD COLUMN "reviewedByUserId" TEXT,
ADD COLUMN "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "RoadmapSuggestion_status_createdAt_idx" ON "RoadmapSuggestion"("status", "createdAt");
