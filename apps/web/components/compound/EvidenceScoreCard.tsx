"use client";

import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ── Scoring rubric mirrored from scorer.py ──────────────────────────────────
const FACTORS = [
  {
    key: "study_count",
    label: "Volume",
    weight: 0.40,
    description:
      "Number of studies indexed from PubMed and Semantic Scholar. " +
      "Uses a logarithmic curve — going from 0→5 studies matters more than 50→55.",
  },
  {
    key: "study_quality",
    label: "Quality",
    weight: 0.30,
    description:
      "Weighted average study type: meta-analysis (5×) > RCT (4×) > cohort (3×) > " +
      "case-control (2.5×) > cross-sectional (2×) > review (2.5×) > animal (1×) > in vitro (0.5×). " +
      "Each meta-analysis adds +3 bonus points (max +15).",
  },
  {
    key: "sample_size",
    label: "Sample Size",
    weight: 0.10,
    description:
      "Total participants summed across all indexed studies. " +
      "Logarithmic scale: 100 participants ≈ 46pts, 1,000 ≈ 69pts, 10,000 ≈ 92pts.",
  },
  {
    key: "consistency",
    label: "Consistency",
    weight: 0.10,
    description:
      "What percentage of studies agree on the direction of effect " +
      "(increase / decrease / no change). High consistency = high confidence.",
  },
  {
    key: "replication",
    label: "Replication",
    weight: 0.05,
    description:
      "Number of independent research groups that have studied this compound. " +
      "Single-lab findings score lower than findings replicated across many institutions.",
  },
  {
    key: "recency",
    label: "Recency",
    weight: 0.05,
    description:
      "Proportion of studies published in the last 3–5 years. " +
      "Active research areas score higher.",
  },
] as const;

const LEVELS = [
  {
    level: "A",
    label: "Strong",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
    description: "Score ≥75 with at least 1 meta-analysis and 3+ RCTs",
  },
  {
    level: "B",
    label: "Moderate",
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-100 dark:bg-blue-900/30",
    description: "Score ≥50 with at least 1 RCT or meta-analysis",
  },
  {
    level: "C",
    label: "Weak",
    color: "text-yellow-600 dark:text-yellow-400",
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    description: "Score ≥25 — observational or animal evidence only",
  },
  {
    level: "D",
    label: "Preliminary",
    color: "text-zinc-500 dark:text-zinc-400",
    bg: "bg-zinc-100 dark:bg-zinc-800",
    description: "Score <25 — very limited or preclinical data",
  },
];

interface Props {
  evidenceScore: number | null;
  studyCount: number;
  metaAnalysisCount: number;
  scoreBreakdown: Record<string, number> | null;
}

function FactorBar({
  value,
  weight,
}: {
  value: number | null;
  weight: number;
}) {
  if (value === null) {
    return (
      <div className="h-2 rounded-full bg-muted w-full overflow-hidden">
        <div className="h-full w-0 bg-muted-foreground/30 rounded-full" />
      </div>
    );
  }
  const pct = Math.round(value);
  const color =
    pct >= 70
      ? "bg-green-500"
      : pct >= 40
        ? "bg-yellow-500"
        : "bg-red-400";
  return (
    <div className="h-2 rounded-full bg-muted w-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function EvidenceScoreCard({
  evidenceScore,
  studyCount,
  metaAnalysisCount,
  scoreBreakdown,
}: Props) {
  const level =
    evidenceScore == null
      ? null
      : evidenceScore >= 75
        ? LEVELS[0]
        : evidenceScore >= 50
          ? LEVELS[1]
          : evidenceScore >= 25
            ? LEVELS[2]
            : LEVELS[3];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
          Evidence Score
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                Composite 0–100 score computed from PubMed and Semantic Scholar data.
                Inspired by the GRADE framework and Oxford Centre for Evidence-Based Medicine levels.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Score + level badge */}
        <div className="flex items-end gap-3">
          <div
            className={`text-4xl font-bold tabular-nums leading-none ${
              evidenceScore == null
                ? "text-zinc-400"
                : evidenceScore >= 60
                  ? "text-green-600 dark:text-green-400"
                  : evidenceScore >= 30
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-red-500"
            }`}
          >
            {evidenceScore != null ? evidenceScore.toFixed(0) : "—"}
          </div>
          <div className="mb-1 space-y-0.5">
            {level && (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold ${level.bg} ${level.color}`}
              >
                Level {level.level} — {level.label}
              </span>
            )}
            <div className="text-xs text-muted-foreground">
              {studyCount} {studyCount === 1 ? "study" : "studies"} indexed
              {metaAnalysisCount > 0 && ` · ${metaAnalysisCount} meta-${metaAnalysisCount === 1 ? "analysis" : "analyses"}`}
            </div>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-2.5">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Scoring Factors
          </div>
          {FACTORS.map((f) => {
            const val = scoreBreakdown?.[f.key] ?? null;
            return (
              <TooltipProvider key={f.key} delayDuration={150}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="space-y-1 cursor-help group">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-foreground flex items-center gap-1">
                          {f.label}
                          <span className="text-muted-foreground font-normal">
                            ({Math.round(f.weight * 100)}%)
                          </span>
                        </span>
                        <span className="text-xs tabular-nums font-mono text-muted-foreground">
                          {val !== null ? `${Math.round(val)}/100` : "—"}
                        </span>
                      </div>
                      <FactorBar value={val} weight={f.weight} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs">
                    {f.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
          {!scoreBreakdown && studyCount > 0 && (
            <p className="text-xs text-muted-foreground pt-1">
              Factor breakdown will appear after next research sync.
            </p>
          )}
        </div>

        {/* Level legend */}
        <div className="space-y-1.5 pt-1 border-t">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Evidence Levels
          </div>
          {LEVELS.map((l) => (
            <div key={l.level} className="flex items-start gap-2 text-xs">
              <span
                className={`shrink-0 rounded-full px-1.5 py-0.5 font-bold ${l.bg} ${l.color}`}
              >
                {l.level}
              </span>
              <span className="text-muted-foreground">{l.description}</span>
            </div>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
