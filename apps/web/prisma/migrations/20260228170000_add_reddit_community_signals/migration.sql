DO $$ BEGIN
  CREATE TYPE "CommunitySignalSource" AS ENUM ('REDDIT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "CommunityGoalLabel" AS ENUM (
    'BULK',
    'CUT',
    'RECOMP',
    'SIDE_EFFECTS',
    'RECOVERY',
    'PERFORMANCE',
    'LIBIDO',
    'SLEEP',
    'MOOD',
    'GENERAL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "CommunitySignalRun" (
  "id" TEXT NOT NULL,
  "source" "CommunitySignalSource" NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'COMPLETED',
  "subreddits" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "postsScanned" INTEGER NOT NULL DEFAULT 0,
  "commentsScanned" INTEGER NOT NULL DEFAULT 0,
  "mentionCount" INTEGER NOT NULL DEFAULT 0,
  "notes" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunitySignalRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CommunitySignalMention" (
  "id" TEXT NOT NULL,
  "source" "CommunitySignalSource" NOT NULL,
  "windowDays" INTEGER NOT NULL,
  "goalLabel" "CommunityGoalLabel" NOT NULL,
  "mentionCount" INTEGER NOT NULL DEFAULT 0,
  "uniqueThreads" INTEGER NOT NULL DEFAULT 0,
  "uniqueAuthors" INTEGER NOT NULL DEFAULT 0,
  "subredditBreakdown" JSONB,
  "firstSeenAt" TIMESTAMP(3) NOT NULL,
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "compoundId" TEXT NOT NULL,
  "runId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunitySignalMention_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CommunitySignalMention_compoundId_fkey"
    FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "CommunitySignalMention_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "CommunitySignalRun"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "CommunitySignalMention_source_windowDays_compoundId_goalLabel_key"
  ON "CommunitySignalMention"("source", "windowDays", "compoundId", "goalLabel");

CREATE INDEX IF NOT EXISTS "CommunitySignalRun_source_startedAt_idx"
  ON "CommunitySignalRun"("source", "startedAt");

CREATE INDEX IF NOT EXISTS "CommunitySignalMention_windowDays_mentionCount_idx"
  ON "CommunitySignalMention"("windowDays", "mentionCount");

CREATE INDEX IF NOT EXISTS "CommunitySignalMention_compoundId_goalLabel_idx"
  ON "CommunitySignalMention"("compoundId", "goalLabel");
