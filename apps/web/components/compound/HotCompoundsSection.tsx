import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, CalendarDays, Flame, Sparkles } from "lucide-react";
import type { CompoundSummary } from "./types";
import { CategoryBadge } from "./CategoryBadge";
import { EvidenceScoreBadge } from "./EvidenceScoreBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface MomentumCompound extends CompoundSummary {
  recentMentions: number;
  recentHighQuality: number;
  latestStudyYear: number | null;
  trendScore: number;
}

interface Props {
  hotCompounds: MomentumCompound[];
  emergingCompounds: MomentumCompound[];
  refreshedLabel: string;
}

function MomentumCard({
  title,
  icon,
  compounds,
  emptyText,
}: {
  title: string;
  icon: ReactNode;
  compounds: MomentumCompound[];
  emptyText: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {compounds.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          compounds.map((c, i) => (
            <Link
              key={c.id}
              href={`/compounds/${c.slug}`}
              className="group block rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">#{i + 1}</p>
                  <p className="font-semibold text-sm leading-snug group-hover:underline underline-offset-2">
                    {c.name}
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={c.category} />
                    {c.legalStatus !== "LEGAL" && (
                      <Badge variant="outline" className="text-[10px]">
                        {c.legalStatus.replace(/_/g, " ")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {c.recentMentions} recent stud{c.recentMentions === 1 ? "y" : "ies"}
                    {c.recentHighQuality > 0
                      ? ` · ${c.recentHighQuality} high-tier`
                      : ""}
                    {c.latestStudyYear ? ` · latest ${c.latestStudyYear}` : ""}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <EvidenceScoreBadge score={c.evidenceScore} />
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function HotCompoundsSection({
  hotCompounds,
  emergingCompounds,
  refreshedLabel,
}: Props) {
  return (
    <section className="mb-7 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Hot & New</h2>
          <p className="text-sm text-muted-foreground">
            Weekly snapshot of compounds with the strongest recent research momentum.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          {refreshedLabel}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MomentumCard
          title="Hot This Week"
          icon={<Flame className="h-4 w-4 text-orange-500" />}
          compounds={hotCompounds}
          emptyText="No high-momentum compounds found yet. Run research sync to populate this."
        />
        <MomentumCard
          title="New & Emerging"
          icon={<Sparkles className="h-4 w-4 text-blue-500" />}
          compounds={emergingCompounds}
          emptyText="No emerging compounds yet."
        />
      </div>
    </section>
  );
}
