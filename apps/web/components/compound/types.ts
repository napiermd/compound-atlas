import type { CompoundCategory, LegalStatus } from "@prisma/client";

export interface CompoundSummary {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  category: CompoundCategory;
  subcategory: string | null;
  legalStatus: LegalStatus;
  mechanismShort: string | null;
  evidenceScore: number | null;
  safetyScore: number | null;
  studyCount: number;
  metaAnalysisCount: number;
  doseTypical: number | null;
  doseUnit: string | null;
  doseFrequency: string | null;
  clinicalPhase: string | null;
  createdAt: Date | string;
  lastResearchSync: Date | string | null;
  lastLiteratureSync: Date | string | null;
  lastReviewedAt: Date | string | null;
  isStale: boolean;
}

export interface SideEffectData {
  id: string;
  name: string;
  severity: string | null;
  frequency: string | null;
  notes: string | null;
}

export interface InteractionData {
  id: string;
  interactionType: string;
  severity: string | null;
  description: string | null;
  target: {
    name: string;
    slug: string;
    category: CompoundCategory;
  };
}

export interface MechanismData {
  id: string;
  pathway: string;
  description: string | null;
}

export interface StudyData {
  id: string;
  pmid: string | null;
  title: string;
  studyType: string;
  evidenceLevel: string | null;
  year: number | null;
  sampleSize: number | null;
  fullTextUrl: string | null;
  tldr: string | null;
}

export interface CompoundDetail extends CompoundSummary {
  description: string | null;
  halfLife: string | null;
  onset: string | null;
  duration: string | null;
  routeOfAdmin: string[];
  doseMin: number | null;
  doseMax: number | null;
  scoreBreakdown: Record<string, number> | null;
  sideEffects: SideEffectData[];
  interactions: InteractionData[];
  mechanisms: MechanismData[];
  studies: { study: StudyData }[];
}
