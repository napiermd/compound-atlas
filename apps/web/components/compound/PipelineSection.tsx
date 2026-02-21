"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "./CategoryBadge";
import { EvidenceScoreBadge } from "./EvidenceScoreBadge";
import type { CompoundSummary } from "./types";

const PHASE_ORDER = [
  "Preclinical",
  "Phase I",
  "Phase II",
  "Phase III",
  "Approved",
] as const;

interface Props {
  phaseGroups: Record<string, CompoundSummary[]>;
}

function PhaseColumn({
  phase,
  compounds,
}: {
  phase: string;
  compounds: CompoundSummary[];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? compounds : compounds.slice(0, 3);
  const hasMore = compounds.length > 3;

  return (
    <div className="flex-1 min-w-[180px]">
      <div className="text-center mb-3">
        <h4 className="text-sm font-semibold">{phase}</h4>
        <span className="text-xs text-muted-foreground">
          ({compounds.length})
        </span>
      </div>
      <div className="space-y-2">
        {visible.map((c) => (
          <Link key={c.id} href={`/compounds/${c.slug}`}>
            <Card className="hover:border-zinc-400 dark:hover:border-zinc-500 transition-colors cursor-pointer">
              <CardContent className="p-2.5">
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <span className="text-xs font-medium leading-tight line-clamp-1">
                    {c.name}
                  </span>
                  <EvidenceScoreBadge
                    score={c.evidenceScore}
                    className="shrink-0"
                  />
                </div>
                <CategoryBadge category={c.category} />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      {hasMore && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          See all {compounds.length}
        </button>
      )}
      {expanded && hasMore && (
        <button
          onClick={() => setExpanded(false)}
          className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          Show less
        </button>
      )}
    </div>
  );
}

export function PipelineSection({ phaseGroups }: Props) {
  const activePhasesInOrder = PHASE_ORDER.filter(
    (p) => phaseGroups[p] && phaseGroups[p].length > 0
  );

  if (activePhasesInOrder.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold tracking-tight mb-1">
        Research Pipeline
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Compounds grouped by clinical trial phase
      </p>

      <div className="rounded-lg border bg-card p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          {activePhasesInOrder.map((phase, i) => (
            <div key={phase} className="flex items-start">
              <PhaseColumn phase={phase} compounds={phaseGroups[phase]} />
              {i < activePhasesInOrder.length - 1 && (
                <div className="flex items-center px-2 pt-8">
                  <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
