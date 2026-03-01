-- Phase 2 community analytics fields on mentions.
ALTER TABLE "CommunityMention"
  ADD COLUMN IF NOT EXISTS "sentimentScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "qualityScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "spamScore" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "themeTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
