ALTER TABLE "Compound"
  ADD COLUMN IF NOT EXISTS "lastReviewedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Compound_lastResearchSync_idx" ON "Compound"("lastResearchSync");
CREATE INDEX IF NOT EXISTS "Compound_lastReviewedAt_idx" ON "Compound"("lastReviewedAt");
