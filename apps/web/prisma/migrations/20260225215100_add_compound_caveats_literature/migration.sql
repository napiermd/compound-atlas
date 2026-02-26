-- AlterTable
ALTER TABLE "Compound"
ADD COLUMN     "evidenceLevel" "EvidenceLevel",
ADD COLUMN     "legalCaveats" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "literatureLinks" JSONB,
ADD COLUMN     "safetyCaveats" TEXT[] DEFAULT ARRAY[]::TEXT[];
