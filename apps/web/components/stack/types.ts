import type { CompoundCategory, StackCategory, StackGoal } from "@prisma/client";

export interface CompoundOption {
  id: string;
  slug: string;
  name: string;
  category: CompoundCategory;
  evidenceScore: number | null;
  doseUnit: string | null;
}

export type UpdatableField =
  | "dose"
  | "unit"
  | "frequency"
  | "startWeek"
  | "endWeek"
  | "notes";

export interface StackedCompound {
  rowId: string;
  compoundId: string;
  name: string;
  category: CompoundCategory;
  evidenceScore: number | null;
  dose: string;
  unit: string;
  frequency: string;
  startWeek: string;
  endWeek: string;
  notes: string;
  notesOpen: boolean;
}

export interface StackInteraction {
  id: string;
  sourceCompoundId: string;
  targetCompoundId: string;
  interactionType: string;
  severity: string | null;
  description: string | null;
  source: { name: string; slug: string };
  target: { name: string; slug: string };
}

export interface StackSummary {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  goal: StackGoal;
  durationWeeks: number | null;
  isPublic: boolean;
  evidenceScore: number | null;
  category: StackCategory;
  folder?: string | null;
  tags?: string[];
  riskFlags?: string[];
  orderIndex?: number;
  upvotes: number;
  forkCount: number;
  forkedFromId: string | null;
  createdAt: string;
  updatedAt?: string;
  creatorId?: string;
  creator: { name: string | null; image: string | null };
  compounds: Array<{
    id: string;
    compound: {
      name: string;
      slug: string;
      category: CompoundCategory;
      safetyCaveats?: string[];
      legalCaveats?: string[];
      lastResearchSync?: string | Date | null;
      lastReviewedAt?: string | Date | null;
    };
  }>;
  _count: { cycles: number; forks: number };
  userHasUpvoted?: boolean;
}
