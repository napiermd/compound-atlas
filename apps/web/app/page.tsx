import Link from "next/link";
import {
  ArrowRight,
  Github,
  BookOpen,
  Layers,
  Activity,
  FlaskConical,
  Star,
  Users,
  RefreshCw,
  Clock,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CompoundCard } from "@/components/compound/CompoundCard";
import { db } from "@/lib/db";
import type { CompoundSummary } from "@/components/compound/types";

const FEATURES = [
  {
    icon: BookOpen,
    title: "Research-Backed",
    desc: "Evidence scores computed from real peer-reviewed studies on PubMed and Semantic Scholar.",
  },
  {
    icon: Layers,
    title: "Stack Builder",
    desc: "Combine compounds into goal-driven protocols. Check interactions. Fork and share community stacks.",
  },
  {
    icon: Activity,
    title: "Cycle Tracker",
    desc: "Log doses, bloodwork, weight, and subjective markers daily. Visualize progress over time.",
  },
  {
    icon: FlaskConical,
    title: "Open Source",
    desc: "Community-driven. No paywalls, no ads. Every compound, every study, always free.",
  },
];

const SCORING_FACTORS = [
  {
    icon: FlaskConical,
    label: "Study Count",
    desc: "More studies mean a stronger evidence signal.",
  },
  {
    icon: Star,
    label: "Study Quality",
    desc: "RCTs and systematic reviews weighted over case reports.",
  },
  {
    icon: Users,
    label: "Sample Size",
    desc: "Larger cohorts reduce noise in the signal.",
  },
  {
    icon: TrendingUp,
    label: "Consistency",
    desc: "Aligned results across independent research groups.",
  },
  {
    icon: RefreshCw,
    label: "Replication",
    desc: "Multiple independent replications required for high scores.",
  },
  {
    icon: Clock,
    label: "Recency",
    desc: "Recent research weighted more heavily than older studies.",
  },
];

export default async function HomePage() {
  const [compoundCount, studyCount, topCompoundsRaw] = await Promise.all([
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

  const topCompounds = topCompoundsRaw as CompoundSummary[];

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

        <div className="relative max-w-5xl mx-auto px-4 py-28 sm:py-36 text-center">
          <Badge variant="outline" className="mb-5 px-3 py-1 text-xs">
            Open Source · MIT License
          </Badge>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.15] mb-6 max-w-4xl mx-auto">
            Evidence-Based Enhancement,{" "}
            <span className="text-muted-foreground">Open Source</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Browse compounds scored by real research from PubMed and Semantic
            Scholar. Build stacks. Track cycles. Free forever.
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
              <p className="text-3xl font-bold">100%</p>
              <p className="text-muted-foreground mt-1">free, forever</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-16 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-xl border bg-card p-6 space-y-3"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
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
              computed from indexed research. No manual curation. No opinion.
              Pure data.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SCORING_FACTORS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex gap-3">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── BOTTOM CTA ───────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 pb-16 w-full">
        <div className="rounded-xl bg-primary text-primary-foreground px-8 py-12 text-center">
          <h2 className="text-2xl font-bold mb-2">Start Exploring</h2>
          <p className="text-primary-foreground/70 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
            Browse the compound database, build a stack, or contribute to the
            open-source project.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button asChild size="lg" variant="secondary">
              <Link href="/compounds">Browse Compounds</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="https://github.com/napiermd/compound-atlas" target="_blank" rel="noopener noreferrer">Contribute on GitHub</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
