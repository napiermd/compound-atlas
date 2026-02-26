-- CreateEnum
CREATE TYPE "StackCategory" AS ENUM ('PERFORMANCE', 'COGNITION', 'RECOVERY', 'HEALTH', 'LONGEVITY', 'SPECIALTY');

-- AlterTable
ALTER TABLE "Stack"
ADD COLUMN "category" "StackCategory" NOT NULL DEFAULT 'SPECIALTY';

-- Indexes
CREATE INDEX "Stack_category_idx" ON "Stack"("category");
