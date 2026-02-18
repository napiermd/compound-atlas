-- CreateEnum
CREATE TYPE "CompoundCategory" AS ENUM ('SUPPLEMENT', 'NOOTROPIC', 'PEPTIDE', 'ANABOLIC', 'SARM', 'GH_SECRETAGOGUE', 'FAT_LOSS', 'HORMONAL', 'ADAPTOGEN', 'AMINO_ACID', 'VITAMIN_MINERAL', 'OTHER');

-- CreateEnum
CREATE TYPE "LegalStatus" AS ENUM ('LEGAL', 'PRESCRIPTION', 'GRAY_MARKET', 'SCHEDULED', 'RESEARCH_ONLY', 'BANNED');

-- CreateEnum
CREATE TYPE "StudyType" AS ENUM ('META_ANALYSIS', 'SYSTEMATIC_REVIEW', 'RCT', 'CONTROLLED_TRIAL', 'COHORT', 'CASE_CONTROL', 'CROSS_SECTIONAL', 'CASE_REPORT', 'ANIMAL', 'IN_VITRO', 'REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "EvidenceLevel" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "EffectDirection" AS ENUM ('INCREASE', 'DECREASE', 'NO_CHANGE', 'MIXED');

-- CreateEnum
CREATE TYPE "EffectMagnitude" AS ENUM ('TRIVIAL', 'SMALL', 'MODERATE', 'LARGE', 'VERY_LARGE');

-- CreateEnum
CREATE TYPE "StackGoal" AS ENUM ('RECOMP', 'BULK', 'CUT', 'COGNITIVE', 'SLEEP', 'LONGEVITY', 'RECOVERY', 'JOINT_HEALTH', 'MOOD', 'LIBIDO', 'GENERAL_HEALTH', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CycleStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'PAUSED', 'ABORTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Compound" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "category" "CompoundCategory" NOT NULL,
    "subcategory" TEXT,
    "description" TEXT,
    "legalStatus" "LegalStatus" NOT NULL DEFAULT 'LEGAL',
    "halfLife" TEXT,
    "onset" TEXT,
    "duration" TEXT,
    "routeOfAdmin" TEXT[],
    "mechanismShort" TEXT,
    "doseMin" DOUBLE PRECISION,
    "doseTypical" DOUBLE PRECISION,
    "doseMax" DOUBLE PRECISION,
    "doseUnit" TEXT,
    "doseFrequency" TEXT,
    "evidenceScore" DOUBLE PRECISION,
    "safetyScore" DOUBLE PRECISION,
    "studyCount" INTEGER NOT NULL DEFAULT 0,
    "metaAnalysisCount" INTEGER NOT NULL DEFAULT 0,
    "lastResearchSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Compound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Study" (
    "id" TEXT NOT NULL,
    "pmid" TEXT,
    "doi" TEXT,
    "semanticScholarId" TEXT,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "authors" TEXT[],
    "journal" TEXT,
    "year" INTEGER,
    "publicationDate" TIMESTAMP(3),
    "studyType" "StudyType" NOT NULL,
    "evidenceLevel" "EvidenceLevel",
    "sampleSize" INTEGER,
    "durationWeeks" DOUBLE PRECISION,
    "population" TEXT,
    "effectSize" DOUBLE PRECISION,
    "confidenceInterval" TEXT,
    "isOpenAccess" BOOLEAN NOT NULL DEFAULT false,
    "fullTextUrl" TEXT,
    "tldr" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Study_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundStudy" (
    "id" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,

    CONSTRAINT "CompoundStudy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Outcome" (
    "id" TEXT NOT NULL,
    "studyId" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "metricCategory" TEXT,
    "direction" "EffectDirection" NOT NULL,
    "magnitude" "EffectMagnitude",
    "statisticalSignificance" BOOLEAN,
    "pValue" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "Outcome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundSideEffect" (
    "id" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" TEXT,
    "frequency" TEXT,
    "notes" TEXT,

    CONSTRAINT "CompoundSideEffect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundInteraction" (
    "id" TEXT NOT NULL,
    "sourceCompoundId" TEXT NOT NULL,
    "targetCompoundId" TEXT NOT NULL,
    "interactionType" TEXT NOT NULL,
    "severity" TEXT,
    "description" TEXT,

    CONSTRAINT "CompoundInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompoundMechanism" (
    "id" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "pathway" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CompoundMechanism_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stack" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "goal" "StackGoal" NOT NULL,
    "durationWeeks" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "evidenceScore" DOUBLE PRECISION,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "forkCount" INTEGER NOT NULL DEFAULT 0,
    "forkedFromId" TEXT,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stack_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StackCompound" (
    "id" TEXT NOT NULL,
    "stackId" TEXT NOT NULL,
    "compoundId" TEXT NOT NULL,
    "dose" DOUBLE PRECISION,
    "unit" TEXT,
    "frequency" TEXT,
    "startWeek" INTEGER,
    "endWeek" INTEGER,
    "notes" TEXT,

    CONSTRAINT "StackCompound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stackId" TEXT,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "CycleStatus" NOT NULL DEFAULT 'PLANNED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CycleEntry" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "compoundsTaken" JSONB,
    "weight" DOUBLE PRECISION,
    "bodyFatPercent" DOUBLE PRECISION,
    "restingHR" INTEGER,
    "bloodPressure" TEXT,
    "sleepHours" DOUBLE PRECISION,
    "sleepQuality" INTEGER,
    "mood" INTEGER,
    "energy" INTEGER,
    "libido" INTEGER,
    "appetite" INTEGER,
    "symptoms" TEXT[],
    "notes" TEXT,

    CONSTRAINT "CycleEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BloodworkPanel" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "labName" TEXT,
    "results" JSONB NOT NULL,
    "fileUrl" TEXT,
    "notes" TEXT,

    CONSTRAINT "BloodworkPanel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Compound_slug_key" ON "Compound"("slug");

-- CreateIndex
CREATE INDEX "Compound_category_idx" ON "Compound"("category");

-- CreateIndex
CREATE INDEX "Compound_evidenceScore_idx" ON "Compound"("evidenceScore");

-- CreateIndex
CREATE INDEX "Compound_slug_idx" ON "Compound"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Study_pmid_key" ON "Study"("pmid");

-- CreateIndex
CREATE UNIQUE INDEX "Study_doi_key" ON "Study"("doi");

-- CreateIndex
CREATE UNIQUE INDEX "Study_semanticScholarId_key" ON "Study"("semanticScholarId");

-- CreateIndex
CREATE INDEX "Study_studyType_idx" ON "Study"("studyType");

-- CreateIndex
CREATE INDEX "Study_year_idx" ON "Study"("year");

-- CreateIndex
CREATE INDEX "Study_evidenceLevel_idx" ON "Study"("evidenceLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CompoundStudy_compoundId_studyId_key" ON "CompoundStudy"("compoundId", "studyId");

-- CreateIndex
CREATE INDEX "Outcome_metric_idx" ON "Outcome"("metric");

-- CreateIndex
CREATE INDEX "Outcome_compoundId_idx" ON "Outcome"("compoundId");

-- CreateIndex
CREATE UNIQUE INDEX "CompoundInteraction_sourceCompoundId_targetCompoundId_key" ON "CompoundInteraction"("sourceCompoundId", "targetCompoundId");

-- CreateIndex
CREATE UNIQUE INDEX "Stack_slug_key" ON "Stack"("slug");

-- CreateIndex
CREATE INDEX "Stack_goal_idx" ON "Stack"("goal");

-- CreateIndex
CREATE INDEX "Stack_isPublic_upvotes_idx" ON "Stack"("isPublic", "upvotes");

-- CreateIndex
CREATE UNIQUE INDEX "StackCompound_stackId_compoundId_key" ON "StackCompound"("stackId", "compoundId");

-- CreateIndex
CREATE INDEX "Cycle_userId_status_idx" ON "Cycle"("userId", "status");

-- CreateIndex
CREATE INDEX "CycleEntry_cycleId_date_idx" ON "CycleEntry"("cycleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CycleEntry_cycleId_date_key" ON "CycleEntry"("cycleId", "date");

-- CreateIndex
CREATE INDEX "BloodworkPanel_cycleId_date_idx" ON "BloodworkPanel"("cycleId", "date");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundStudy" ADD CONSTRAINT "CompoundStudy_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundStudy" ADD CONSTRAINT "CompoundStudy_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_studyId_fkey" FOREIGN KEY ("studyId") REFERENCES "Study"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outcome" ADD CONSTRAINT "Outcome_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundSideEffect" ADD CONSTRAINT "CompoundSideEffect_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundInteraction" ADD CONSTRAINT "CompoundInteraction_sourceCompoundId_fkey" FOREIGN KEY ("sourceCompoundId") REFERENCES "Compound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundInteraction" ADD CONSTRAINT "CompoundInteraction_targetCompoundId_fkey" FOREIGN KEY ("targetCompoundId") REFERENCES "Compound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompoundMechanism" ADD CONSTRAINT "CompoundMechanism_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stack" ADD CONSTRAINT "Stack_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stack" ADD CONSTRAINT "Stack_forkedFromId_fkey" FOREIGN KEY ("forkedFromId") REFERENCES "Stack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StackCompound" ADD CONSTRAINT "StackCompound_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StackCompound" ADD CONSTRAINT "StackCompound_compoundId_fkey" FOREIGN KEY ("compoundId") REFERENCES "Compound"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cycle" ADD CONSTRAINT "Cycle_stackId_fkey" FOREIGN KEY ("stackId") REFERENCES "Stack"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CycleEntry" ADD CONSTRAINT "CycleEntry_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BloodworkPanel" ADD CONSTRAINT "BloodworkPanel_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "Cycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
