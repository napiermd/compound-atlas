-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('SEDENTARY', 'LIGHTLY_ACTIVE', 'MODERATELY_ACTIVE', 'VERY_ACTIVE', 'ATHLETE');

-- CreateEnum
CREATE TYPE "HealthGoal" AS ENUM ('MUSCLE_GROWTH', 'FAT_LOSS', 'COGNITIVE_ENHANCEMENT', 'SLEEP_OPTIMIZATION', 'LONGEVITY', 'HORMONE_OPTIMIZATION', 'GENERAL_WELLNESS', 'ATHLETIC_PERFORMANCE', 'STRESS_MANAGEMENT', 'JOINT_HEALTH');

-- DropIndex
DROP INDEX "Compound_lastResearchSync_idx";

-- DropIndex
DROP INDEX "Compound_lastReviewedAt_idx";

-- DropIndex
DROP INDEX "Stack_category_idx";

-- AlterTable
ALTER TABLE "Compound" ADD COLUMN     "clinicalNotes" TEXT,
ADD COLUMN     "contraindications" TEXT[],
ADD COLUMN     "evidenceGrade" TEXT,
ADD COLUMN     "fdaStatus" TEXT,
ADD COLUMN     "fdaStatusNote" TEXT,
ADD COLUMN     "monitoringRequirements" TEXT[];

-- CreateTable
CREATE TABLE "HealthProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "age" INTEGER,
    "biologicalSex" "BiologicalSex",
    "heightCm" DOUBLE PRECISION,
    "weightKg" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "activityLevel" "ActivityLevel",
    "sleepHours" DOUBLE PRECISION,
    "goals" "HealthGoal"[],
    "conditions" TEXT[],
    "medications" TEXT[],
    "allergies" TEXT[],
    "dietType" TEXT,
    "smokingStatus" TEXT,
    "alcoholUse" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabResult" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marker" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "refRangeLow" DOUBLE PRECISION,
    "refRangeHigh" DOUBLE PRECISION,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "labName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthProfile_userId_key" ON "HealthProfile"("userId");

-- CreateIndex
CREATE INDEX "LabResult_userId_marker_idx" ON "LabResult"("userId", "marker");

-- CreateIndex
CREATE INDEX "LabResult_userId_testedAt_idx" ON "LabResult"("userId", "testedAt");

-- AddForeignKey
ALTER TABLE "HealthProfile" ADD CONSTRAINT "HealthProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabResult" ADD CONSTRAINT "LabResult_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
