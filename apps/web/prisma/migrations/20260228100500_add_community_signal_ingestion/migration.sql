-- Community ingestion tables for Reddit nootropics signal tracking
CREATE TYPE "CommunityPlatform" AS ENUM ('REDDIT');

CREATE TABLE "CommunitySource" (
  "id" TEXT NOT NULL,
  "platform" "CommunityPlatform" NOT NULL,
  "identifier" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunitySource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunitySource_platform_identifier_key"
  ON "CommunitySource"("platform", "identifier");

CREATE TABLE "CommunityMention" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "compoundId" TEXT NOT NULL,
  "externalId" TEXT NOT NULL,
  "title" TEXT,
  "body" TEXT,
  "url" TEXT,
  "score" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunityMention_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityMention_externalId_compoundId_key"
  ON "CommunityMention"("externalId", "compoundId");
CREATE INDEX "CommunityMention_compoundId_occurredAt_idx"
  ON "CommunityMention"("compoundId", "occurredAt");

CREATE TABLE "CommunityMentionGoal" (
  "id" TEXT NOT NULL,
  "mentionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  CONSTRAINT "CommunityMentionGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CommunityMentionGoal_mentionId_label_key"
  ON "CommunityMentionGoal"("mentionId", "label");
CREATE INDEX "CommunityMentionGoal_label_idx"
  ON "CommunityMentionGoal"("label");

CREATE TABLE "CommunitySignalAggregate" (
  "id" TEXT NOT NULL,
  "compoundId" TEXT NOT NULL,
  "goalLabel" TEXT NOT NULL,
  "platform" "CommunityPlatform" NOT NULL,
  "windowDays" INTEGER NOT NULL,
  "windowStart" TIMESTAMP(3) NOT NULL,
  "windowEnd" TIMESTAMP(3) NOT NULL,
  "mentionCount" INTEGER NOT NULL,
  "scoreSum" INTEGER NOT NULL DEFAULT 0,
  "commentSum" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommunitySignalAggregate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunitySignalAggregate_compoundId_windowDays_idx"
  ON "CommunitySignalAggregate"("compoundId", "windowDays");
CREATE INDEX "CommunitySignalAggregate_goalLabel_windowDays_idx"
  ON "CommunitySignalAggregate"("goalLabel", "windowDays");
CREATE INDEX "CommunitySignalAggregate_platform_windowDays_idx"
  ON "CommunitySignalAggregate"("platform", "windowDays");

ALTER TABLE "CommunityMention"
  ADD CONSTRAINT "CommunityMention_sourceId_fkey"
  FOREIGN KEY ("sourceId") REFERENCES "CommunitySource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityMention"
  ADD CONSTRAINT "CommunityMention_compoundId_fkey"
  FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunityMentionGoal"
  ADD CONSTRAINT "CommunityMentionGoal_mentionId_fkey"
  FOREIGN KEY ("mentionId") REFERENCES "CommunityMention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CommunitySignalAggregate"
  ADD CONSTRAINT "CommunitySignalAggregate_compoundId_fkey"
  FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
