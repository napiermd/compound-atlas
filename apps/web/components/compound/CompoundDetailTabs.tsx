"use client";

import { useEffect, useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { AlertTriangle, BookOpen, Clock, Route, FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DosingCard } from "./DosingCard";
import { EvidenceScoreCard } from "./EvidenceScoreCard";
import { MechanismsList } from "./MechanismsList";
import { SideEffectsTable } from "./SideEffectsTable";
import { InteractionsTable } from "./InteractionsTable";
import type { CompoundDetail } from "./types";
import type { UserBiometrics } from "@/lib/dose-utils";
import { formatCategory } from "@/lib/utils";

interface Props {
  compound: CompoundDetail;
  biometrics?: UserBiometrics | null;
}

function StudyBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    A: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    B: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    C: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    D: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${colors[level] ?? colors.D}`}
    >
      Level {level}
    </span>
  );
}

function evidenceNarrative(score: number | null, studyCount: number): string {
  if (score == null) {
    return "Evidence scoring has not been fully computed yet, so interpret this profile as preliminary.";
  }
  if (score >= 75) {
    return `Evidence is strong (${Math.round(score)}/100) with a relatively mature body of research (${studyCount} indexed studies).`;
  }
  if (score >= 50) {
    return `Evidence is moderate (${Math.round(score)}/100): promising signal from ${studyCount} indexed studies, but context and population still matter.`;
  }
  if (score >= 25) {
    return `Evidence is early (${Math.round(score)}/100): there are positive signals, but the ${studyCount}-study base is still thin.`;
  }
  return `Evidence is very limited (${Math.round(score)}/100), so this should be treated as exploratory only.`;
}

function safetyNarrative(score: number | null): string {
  if (score == null) {
    return "Safety scoring is incomplete. Start conservatively and monitor carefully.";
  }
  if (score >= 70) return "Overall safety profile appears relatively favorable in available data.";
  if (score >= 45) return "Safety profile is mixed. Risk management and monitoring matter.";
  return "Safety profile is concerning. This likely requires tighter clinical oversight.";
}

export function CompoundDetailTabs({ compound: c, biometrics }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const hasResearchData = c.studyCount > 0 || c.evidenceScore != null;

  const radarData = [
    {
      subject: "Evidence",
      value: c.evidenceScore ?? 0,
      fullMark: 100,
    },
    {
      subject: "Safety",
      value: c.safetyScore ?? 0,
      fullMark: 100,
    },
    {
      subject: "Mechanisms",
      value: Math.min(c.mechanisms.length * 20, 100),
      fullMark: 100,
    },
    {
      subject: "Studies",
      value: Math.min(c.studyCount * 5, 100),
      fullMark: 100,
    },
    {
      subject: "Meta-Analyses",
      value: Math.min(c.metaAnalysisCount * 33, 100),
      fullMark: 100,
    },
  ];
  const severeEffects = c.sideEffects.filter((se) => {
    const severity = (se.severity ?? "").toLowerCase();
    return severity.includes("severe") || severity.includes("high");
  });
  const contraindications = c.interactions.filter(
    (ix) => ix.interactionType === "contraindicated"
  );
  const topStudies = c.studies
    .slice()
    .sort((a, b) => {
      const levelRank = (level: string | null) =>
        level === "A" ? 4 : level === "B" ? 3 : level === "C" ? 2 : 1;
      return (
        levelRank(b.study.evidenceLevel) - levelRank(a.study.evidenceLevel) ||
        (b.study.year ?? 0) - (a.study.year ?? 0)
      );
    })
    .slice(0, 3);

  return (
    <Tabs defaultValue="overview">
      <TabsList className="mb-2 flex-wrap h-auto gap-1">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="mechanisms">
          Mechanisms
          {c.mechanisms.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">
              {c.mechanisms.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="side-effects">
          Side Effects
          {c.sideEffects.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">
              {c.sideEffects.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="interactions">
          Interactions
          {c.interactions.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">
              {c.interactions.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="studies">
          Studies
          {c.studyCount > 0 && (
            <span className="ml-1.5 text-xs opacity-60">{c.studyCount}</span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── Overview ── */}
      <TabsContent value="overview" className="mt-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DosingCard compound={c} biometrics={biometrics} />

          {/* Pharmacology card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Pharmacology
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              {c.halfLife && (
                <div className="flex gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs block">
                      Half-life
                    </span>
                    <span>{c.halfLife}</span>
                  </div>
                </div>
              )}
              {c.onset && (
                <div className="flex gap-2">
                  <FlaskConical className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs block">
                      Onset
                    </span>
                    <span>{c.onset}</span>
                  </div>
                </div>
              )}
              {c.duration && (
                <div className="flex gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs block">
                      Duration
                    </span>
                    <span>{c.duration}</span>
                  </div>
                </div>
              )}
              {c.routeOfAdmin.length > 0 && (
                <div className="flex gap-2">
                  <Route className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <span className="text-muted-foreground text-xs block">
                      Routes
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {c.routeOfAdmin.map((r) => (
                        <Badge
                          key={r}
                          variant="secondary"
                          className="text-xs capitalize"
                        >
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {!c.halfLife && !c.onset && !c.routeOfAdmin.length && (
                <p className="text-muted-foreground text-xs">
                  No pharmacology data yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evidence score breakdown */}
        <EvidenceScoreCard
          evidenceScore={c.evidenceScore}
          studyCount={c.studyCount}
          metaAnalysisCount={c.metaAnalysisCount}
          scoreBreakdown={c.scoreBreakdown}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Plain-English Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{c.name}</span> is
                currently categorized as a{" "}
                <span className="font-medium text-foreground">
                  {formatCategory(c.category).toLowerCase()}
                </span>{" "}
                compound.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {evidenceNarrative(c.evidenceScore, c.studyCount)}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {safetyNarrative(c.safetyScore)}
              </p>
              {c.mechanismShort && (
                <div className="rounded-md border bg-muted/30 p-2.5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Core mechanism
                  </p>
                  <p className="text-xs leading-relaxed">{c.mechanismShort}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Practical Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Strongest current signals
                </p>
                {topStudies.length > 0 ? (
                  <ul className="space-y-1.5">
                    {topStudies.map(({ study }) => (
                      <li key={study.id} className="text-xs text-muted-foreground leading-relaxed">
                        <span className="font-medium text-foreground">
                          {study.evidenceLevel ? `Level ${study.evidenceLevel}` : "Study"}:
                        </span>{" "}
                        {study.tldr ?? study.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No indexed study summaries yet.
                  </p>
                )}
              </div>

              {(severeEffects.length > 0 || contraindications.length > 0) && (
                <div className="rounded-md border border-orange-500/30 bg-orange-500/5 p-2.5">
                  <p className="text-xs font-medium flex items-center gap-1 text-orange-700 dark:text-orange-300">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Elevated caution signals
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {severeEffects.length > 0
                      ? `${severeEffects.length} severe/high side effect flag${severeEffects.length === 1 ? "" : "s"}`
                      : "No severe side-effect flags"}
                    {contraindications.length > 0
                      ? ` · ${contraindications.length} contraindicated interaction${contraindications.length === 1 ? "" : "s"}`
                      : ""}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Radar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Compound Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasResearchData && c.mechanisms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Run the research pipeline to populate evidence metrics.
              </p>
            ) : mounted ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                    <PolarGrid />
                    <PolarAngleAxis
                      dataKey="subject"
                      tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Radar
                      name={c.name}
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 animate-pulse bg-muted rounded-md" />
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Mechanisms ── */}
      <TabsContent value="mechanisms" className="mt-4">
        <MechanismsList mechanisms={c.mechanisms} />
      </TabsContent>

      {/* ── Side Effects ── */}
      <TabsContent value="side-effects" className="mt-4">
        <SideEffectsTable sideEffects={c.sideEffects} />
      </TabsContent>

      {/* ── Interactions ── */}
      <TabsContent value="interactions" className="mt-4">
        <InteractionsTable interactions={c.interactions} />
      </TabsContent>

      {/* ── Studies ── */}
      <TabsContent value="studies" className="mt-4">
        {c.studyCount === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              No studies indexed yet.
            </p>
            <p className="text-xs text-muted-foreground">
              Run{" "}
              <code className="font-mono bg-muted px-1 rounded text-xs">
                python -m src.ingest --compound {c.slug}
              </code>{" "}
              to pull research data.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {c.studies.map(({ study }) => (
              <Card key={study.id}>
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium leading-snug">{study.title}</p>
                  <div className="flex flex-wrap gap-2 mt-2 items-center">
                    <Badge variant="outline" className="text-xs capitalize">
                      {study.studyType.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                    {study.evidenceLevel && (
                      <StudyBadge level={study.evidenceLevel} />
                    )}
                    {study.year && (
                      <span className="text-muted-foreground text-xs">
                        {study.year}
                      </span>
                    )}
                    {study.sampleSize && (
                      <span className="text-muted-foreground text-xs">
                        n={study.sampleSize}
                      </span>
                    )}
                    {study.fullTextUrl && (
                      <a
                        href={study.fullTextUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                      >
                        Full text
                      </a>
                    )}
                    {study.pmid && (
                      <a
                        href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
                      >
                        PubMed
                      </a>
                    )}
                  </div>
                  {study.tldr && (
                    <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                      {study.tldr}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
