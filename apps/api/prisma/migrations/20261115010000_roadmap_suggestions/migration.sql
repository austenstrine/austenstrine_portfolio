-- CreateTable
CREATE TABLE "RoadmapSuggestion" (
    "id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "userId" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoadmapSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoadmapSuggestion_createdAt_idx" ON "RoadmapSuggestion"("createdAt");

-- CreateIndex
CREATE INDEX "RoadmapSuggestion_userId_idx" ON "RoadmapSuggestion"("userId");

-- AddForeignKey
ALTER TABLE "RoadmapSuggestion" ADD CONSTRAINT "RoadmapSuggestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
