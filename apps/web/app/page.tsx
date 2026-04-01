import Link from "next/link";
import {
  ArrowRight,
  Github,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompoundCard } from "@/components/compound/CompoundCard";
import { db } from "@/lib/db";
import { normalizeArray } from "@/lib/normalize";
import type { CompoundSummary } from "@/components/compound/types";

const SCORING_FACTORS = [
  {
    label: "Study Count",
    desc: "More studies mean a stronger evidence signal.",
  },
  {
    label: "Study Quality",
    desc: "RCTs and systematic reviews weighted over case reports.",
  },
  {
    label: "Sample Size",
    desc: "Larger cohorts reduce noise in the signal.",
  },
  {
    label: "Consistency",
    desc: "Aligned results across independent research groups.",
  },
  {
    label: "Replication",
    desc: "Multiple independent replications required for high scores.",
  },
  {
    label: "Recency",
    desc: "Recent research weighted more heavily than older studies.",
  },
];

export default async function HomePage() {
  let compoundCount = 0;
  let studyCount = 0;
  let topCompoundsRaw: unknown[] = [];

  try {
    [compoundCount, studyCount, topCompoundsRaw] = await Promise.all([
      db.compound.count(),
      db.study.count(),
      db.compound.findMany({
        where: { evidenceScore: { not: null } },
        orderBy: { evidenceScore: "desc" },
        take: 6,
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
      }),
    ]);
  } catch {
    // Backward-compatible fallback for environments that have not run
    // all compound/study schema migrations yet.
    [compoundCount, studyCount, topCompoundsRaw] = await Promise.all([
      db.compound.count().catch(() => 0),
      db.study.count().catch(() => 0),
      db.compound
        .findMany({
          where: { evidenceScore: { not: null } },
          orderBy: { evidenceScore: "desc" },
          take: 6,
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
          },
        })
        .catch(() => []),
    ]);
  }

  const topCompounds = normalizeArray<CompoundSummary>(topCompoundsRaw);

  return (
    <div className="flex flex-col">
      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Dot grid */}
        <div
          className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.25) 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        {/* Fade to background at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />

        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-24 text-center">
          <Badge variant="outline" className="mb-5 px-3 py-1 text-xs">
            Open Source Research Tool
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.15] mb-6 max-w-4xl mx-auto">
            Research-first compound intelligence
            <span className="text-muted-foreground"> for stacks, cycles, and evidence review</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Explore compounds through indexed literature, transparent scoring,
            and structured tracking workflows. CompoundAtlas is built for people
            who want to inspect the evidence, not just consume recommendations.
          </p>

          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" className="gap-2">
              <Link href="/compounds">
                Explore Compounds
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2" asChild>
              <Link href="https://github.com/napiermd/compound-atlas" target="_blank" rel="noopener noreferrer">
                <Github className="h-4 w-4" />
                View on GitHub
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="flex gap-10 justify-center mt-14 text-sm">
            {compoundCount > 0 && (
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {compoundCount}
                </p>
                <p className="text-muted-foreground mt-1">compounds</p>
              </div>
            )}
            {studyCount > 0 && (
              <div>
                <p className="text-3xl font-bold tabular-nums">{studyCount}</p>
                <p className="text-muted-foreground mt-1">studies indexed</p>
              </div>
            )}
            <div>
              <p className="text-3xl font-bold">MIT</p>
              <p className="text-muted-foreground mt-1">open-source license</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT THIS IS ─────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-4 py-12 w-full">
        <p className="text-base text-muted-foreground leading-relaxed">
          CompoundAtlas indexes{" "}
          <span className="text-foreground font-medium">peer-reviewed studies</span>{" "}
          from PubMed and Semantic Scholar, computes transparent evidence scores,
          and lets you{" "}
          <span className="text-foreground font-medium">build stacks</span>,{" "}
          <span className="text-foreground font-medium">track cycles</span>, and{" "}
          <span className="text-foreground font-medium">check interactions</span>{" "}
          — all open source, no paywalls, no ads.
        </p>
      </section>

      {/* ── TOP COMPOUNDS ────────────────────────────── */}
      {topCompounds.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-8 w-full">
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Highest Evidence Scores
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Top compounds by research coverage
              </p>
            </div>
            <Link
              href="/compounds"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topCompounds.map((c) => (
              <CompoundCard key={c.id} compound={c} />
            ))}
          </div>
        </section>
      )}

      {/* ── HOW SCORING WORKS ────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16 w-full">
        <div className="rounded-xl border bg-card p-8">
          <div className="max-w-2xl mb-8">
            <h2 className="text-xl font-bold tracking-tight mb-2">
              How Evidence Scoring Works
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every compound gets a score from 0–100 based on six factors
              computed from indexed research. The goal is not to replace judgment,
              but to make the underlying signal easier to inspect and compare.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-4">
            {SCORING_FACTORS.map(({ label, desc }) => (
              <div key={label}>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16 w-full">
        <div className="rounded-xl bg-primary text-primary-foreground px-8 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Inspect the evidence directly</h2>
          <p className="text-primary-foreground/70 text-sm mb-8 max-w-md mx-auto leading-relaxed">
            Browse the database, compare compounds, and contribute improvements
            to the scoring and research workflows.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/compounds">Browse Compounds</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-primary-foreground/15 text-primary-foreground hover:bg-primary-foreground/25 border-0"
            >
              <Link href="https://github.com/napiermd/compound-atlas" target="_blank" rel="noopener noreferrer">Contribute on GitHub</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
