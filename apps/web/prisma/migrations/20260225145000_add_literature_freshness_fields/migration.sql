-- AlterTable
ALTER TABLE "Compound"
  ADD COLUMN "lastLiteratureSync" TIMESTAMP(3),
  ADD COLUMN "lastReviewedAt" TIMESTAMP(3),
  ADD COLUMN "isStale" BOOLEAN NOT NULL DEFAULT false;

-- Backfill canonical sync from legacy field
UPDATE "Compound"
SET "lastLiteratureSync" = "lastResearchSync"
WHERE "lastLiteratureSync" IS NULL AND "lastResearchSync" IS NOT NULL;

-- Index stale compounds for fast filtering
CREATE INDEX "Compound_isStale_idx" ON "Compound"("isStale");