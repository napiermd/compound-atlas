import type { Metadata } from "next";
import { db } from "@/lib/db";
import { CompoundFilters } from "@/components/compound/CompoundFilters";
import type { CompoundSummary } from "@/components/compound/types";
import type { CategoryCount } from "@/components/compound/CompoundFilters";

export const metadata: Metadata = {
  title: "Compounds — CompoundAtlas",
  description:
    "Evidence-based database of supplements, nootropics, peptides, and more.",
};

export default async function CompoundsPage() {
  const [rawCompounds, categories] = await Promise.all([
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
      },
      orderBy: [{ studyCount: "desc" }, { name: "asc" }],
    }),
    db.compound.groupBy({
      by: ["category"],
      _count: { _all: true },
      orderBy: { _count: { category: "desc" } },
    }),
  ]);

  const compounds: CompoundSummary[] = rawCompounds;

  const categoryList: CategoryCount[] = categories.map((c) => ({
    category: c.category as CategoryCount["category"],
    count: c._count._all,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Compounds</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Evidence-based profiles for {rawCompounds.length} compound
          {rawCompounds.length !== 1 ? "s" : ""}
        </p>
      </div>

      <CompoundFilters compounds={compounds} categories={categoryList} />
    </div>
  );
}
