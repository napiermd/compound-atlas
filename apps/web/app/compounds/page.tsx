import type { Metadata } from "next";
import type { StudyType } from "@prisma/client";
import { db } from "@/lib/db";
import { CompoundFilters } from "@/components/compound/CompoundFilters";
import type { CompoundSummary } from "@/components/compound/types";
import {
  HotCompoundsSection,
  type MomentumCompound,
} from "@/components/compound/HotCompoundsSection";
import { PipelineSection } from "@/components/compound/PipelineSection";
import { SectionNav } from "@/components/layout/SectionNav";
import type { CategoryCount } from "@/components/compound/CompoundFilters";
import { isCompoundStale } from "@/lib/compound-freshness";
import { normalizeArray } from "@/lib/normalize";

export const metadata: Metadata = {
  title: "Compounds — CompoundAtlas",
  description:
    "Evidence-based database of supplements, nootropics, peptides, and more.",
};

export const revalidate = 60 * 60 * 24 * 7;

const RECENT_WINDOW_DAYS = 365;
const HIGH_TIER_STUDY_TYPES: StudyType[] = [
  "META_ANALYSIS",
  "SYSTEMATIC_REVIEW",
  "RCT",
];

type RawCompoundRow = {
  id: string;
  slug: string;
  name: string;
  aliases: string[];
  category: CompoundSummary["category"];
  subcategory: string | null;
  legalStatus: CompoundSummary["legalStatus"];
  mechanismShort: string | null;
  evidenceScore: number | null;
  safetyScore: number | null;
  studyCount: number;
  metaAnalysisCount: number;
  doseTypical: number | null;
  doseUnit: string | null;
  doseFrequency: string | null;
  clinicalPhase: string | null;
  evidenceLevel?: "A" | "B" | "C" | "D" | null;
  createdAt: Date | string;
  safetyCaveats?: string[];
  legalCaveats?: string[];
  literatureLinks?: unknown | null;
  lastResearchSync?: Date | string | null;
  lastReviewedAt?: Date | string | null;
};

type CategoryRow = {
  category: CategoryCount["category"];
  _count: { _all: number };
};

type RecentStudyRow = {
  studyType: StudyType;
  year: number | null;
  publicationDate: Date | null;
  compounds: { compoundId: string }[];
};

export default async function CompoundsPage() {
  const now = new Date();
  const recentWindowStart = new Date(
    now.getTime() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000
  );
  const recentYearFloor = now.getUTCFullYear() - 1;

  let rawCompounds: RawCompoundRow[] = [];
  let categories: CategoryRow[] = [];
  let recentStudies: RecentStudyRow[] = [];

  try {
    [rawCompounds, categories, recentStudies] = await Promise.all([
      db.compound.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          aliases: true,
          category: true,
          subcategory: true,
          legalStatus: true,
          mechanismShort: true,
          evidenceScore: true,
          safetyScore: true,
          studyCount: true,
          metaAnalysisCount: true,
          doseTypical: true,
          doseUnit: true,
          doseFrequency: true,
          clinicalPhase: true,
          evidenceLevel: true,
          safetyCaveats: true,
          legalCaveats: true,
          literatureLinks: true,
          createdAt: true,
          lastResearchSync: true,
          lastReviewedAt: true,
        },
        orderBy: [{ studyCount: "desc" }, { name: "asc" }],
      }),
      db.compound.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
      db.study.findMany({
        where: {
          OR: [
            { publicationDate: { gte: recentWindowStart } },
            { year: { gte: recentYearFloor } },
          ],
        },
        select: {
          id: true,
          studyType: true,
          year: true,
          publicationDate: true,
          compounds: {
            select: {
              compoundId: true,
            },
          },
        },
        take: 700,
        orderBy: [{ publicationDate: "desc" }, { year: "desc" }],
      }),
    ]);
  } catch {
    // Backward-compatible fallback for environments where new DB columns
    // are not migrated yet; keep compounds page functional.
    [rawCompounds, categories, recentStudies] = await Promise.all([
      db.compound.findMany({
        select: {
          id: true,
          slug: true,
          name: true,
          aliases: true,
          category: true,
          subcategory: true,
          legalStatus: true,
          mechanismShort: true,
          evidenceScore: true,
          safetyScore: true,
          studyCount: true,
          metaAnalysisCount: true,
          doseTypical: true,
          doseUnit: true,
          doseFrequency: true,
          clinicalPhase: true,
          createdAt: true,
        },
        orderBy: [{ studyCount: "desc" }, { name: "asc" }],
      }),
      db.compound.groupBy({
        by: ["category"],
        _count: { _all: true },
        orderBy: { _count: { category: "desc" } },
      }),
      db.study.findMany({
        where: {
          OR: [
            { publicationDate: { gte: recentWindowStart } },
            { year: { gte: recentYearFloor } },
          ],
        },
        select: {
          id: true,
          studyType: true,
          year: true,
          publicationDate: true,
          compounds: {
            select: {
              compoundId: true,
            },
          },
        },
        take: 700,
        orderBy: [{ publicationDate: "desc" }, { year: "desc" }],
      }),
    ]);
  }

  const compounds: CompoundSummary[] = rawCompounds.map((c) => ({
    ...c,
    evidenceLevel: c.evidenceLevel ?? null,
    safetyCaveats: normalizeArray<string>(c.safetyCaveats),
    legalCaveats: normalizeArray<string>(c.legalCaveats),
    literatureLinks: c.literatureLinks ?? null,
    lastResearchSync: c.lastResearchSync ?? null,
    lastReviewedAt: c.lastReviewedAt ?? null,
    isStale: isCompoundStale(c.lastResearchSync ?? null),
  }));

  const categoryList: CategoryCount[] = categories.map((c) => ({
    category: c.category as CategoryCount["category"],
    count: c._count._all,
  }));

  const momentumByCompound = new Map<
    string,
    { mentions: number; highTier: number; latestYear: number | null }
  >();

  for (const study of recentStudies) {
    const isHighTier = HIGH_TIER_STUDY_TYPES.includes(study.studyType);
    const latestYear =
      study.year ?? study.publicationDate?.getUTCFullYear() ?? null;

    for (const rel of study.compounds) {
      const current = momentumByCompound.get(rel.compoundId) ?? {
        mentions: 0,
        highTier: 0,
        latestYear: null,
      };
      momentumByCompound.set(rel.compoundId, {
        mentions: current.mentions + 1,
        highTier: current.highTier + (isHighTier ? 1 : 0),
        latestYear:
          latestYear != null
            ? current.latestYear == null
              ? latestYear
              : Math.max(current.latestYear, latestYear)
            : current.latestYear,
      });
    }
  }

  const momentumCandidates: MomentumCompound[] = compounds
    .map((c) => {
      const momentum = momentumByCompound.get(c.id);
      const mentions = momentum?.mentions ?? 0;
      const highTier = momentum?.highTier ?? 0;
      const latestYear = momentum?.latestYear ?? null;
      const evidence = c.evidenceScore ?? 35;
      const safety = c.safetyScore ?? 55;
      const trendScore =
        mentions * 3 +
        highTier * 5 +
        Math.min(c.studyCount, 120) * 0.15 +
        evidence * 0.25 +
        safety * 0.15;
      return {
        ...c,
        recentMentions: mentions,
        recentHighQuality: highTier,
        latestStudyYear: latestYear,
        trendScore: Math.round(trendScore * 10) / 10,
      };
    })
    .filter((c) => c.recentMentions > 0);

  const hotCompounds = [...momentumCandidates]
    .sort((a, b) => b.trendScore - a.trendScore)
    .slice(0, 6);

  const emergingCompounds = [...momentumCandidates]
    .filter((c) => c.studyCount <= 35)
    .sort((a, b) => {
      if (b.recentHighQuality !== a.recentHighQuality) {
        return b.recentHighQuality - a.recentHighQuality;
      }
      if (b.recentMentions !== a.recentMentions) {
        return b.recentMentions - a.recentMentions;
      }
      return (b.evidenceScore ?? 0) - (a.evidenceScore ?? 0);
    })
    .slice(0, 6);

  const refreshedLabel = `Updated weekly · window ${recentWindowStart.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}–${now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })}`;

  // Group compounds by clinical phase for pipeline view
  const phaseGroups: Record<string, CompoundSummary[]> = {};
  for (const c of compounds) {
    const phase = c.clinicalPhase;
    if (!phase || phase === "No formal trials") continue;
    if (!phaseGroups[phase]) phaseGroups[phase] = [];
    phaseGroups[phase].push(c);
  }
  // Sort each group by evidence score descending
  for (const group of Object.values(phaseGroups)) {
    group.sort((a, b) => (b.evidenceScore ?? 0) - (a.evidenceScore ?? 0));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionNav current="/compounds" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Compounds</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Evidence-based profiles for {rawCompounds.length} compound
          {rawCompounds.length !== 1 ? "s" : ""}
        </p>
      </div>

      <HotCompoundsSection
        hotCompounds={hotCompounds}
        emergingCompounds={emergingCompounds}
        refreshedLabel={refreshedLabel}
      />

      <PipelineSection phaseGroups={phaseGroups} />

      <CompoundFilters compounds={compounds} categories={categoryList} />
    </div>
  );
}
