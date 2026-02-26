-- AlterTable
ALTER TABLE "Stack"
ADD COLUMN "folder" TEXT,
ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "riskFlags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "orderIndex" INTEGER NOT NULL DEFAULT 0;

-- Indexes
CREATE INDEX "Stack_creatorId_orderIndex_idx" ON "Stack"("creatorId", "orderIndex");