import Link from "next/link";
import { ArrowRight, FlaskConical, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "./CategoryBadge";
import { EvidenceScoreBadge } from "./EvidenceScoreBadge";
import type { CompoundSummary } from "./types";
import { SIGNAL_VOCAB, riskLabelFromScore } from "@/lib/signal-vocabulary";

interface Props {
  compound: CompoundSummary;
}

export function CompoundCard({ compound: c }: Props) {
  const evidenceTier =
    c.evidenceScore == null
      ? "No score yet"
      : c.evidenceScore >= 75
        ? "Strong evidence"
        : c.evidenceScore >= 50
          ? "Moderate evidence"
          : c.evidenceScore >= 25
            ? "Early evidence"
            : "Preliminary";

  const safetyTier = riskLabelFromScore(c.safetyScore);

  return (
    <Link href={`/compounds/${c.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden border-border/70 transition-all duration-200 group-hover:border-primary/40 group-hover:shadow-lg group-hover:shadow-primary/5">
        <div className="h-1 bg-gradient-to-r from-primary/80 via-primary/30 to-transparent" />
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-foreground">
              {c.name}
            </h3>
            <EvidenceScoreBadge score={c.evidenceScore} className="shrink-0 mt-0.5" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <CategoryBadge category={c.category} />
            {c.isStale && (
              <Badge variant="outline" className="text-[10px] font-medium border-amber-500/40 text-amber-700 dark:text-amber-300">
                {SIGNAL_VOCAB.stale}
              </Badge>
            )}
            {c.legalStatus !== "LEGAL" && (
              <Badge variant="outline" className="text-[10px] font-medium">
                {c.legalStatus === "PRESCRIPTION"
                  ? "Rx"
                  : c.legalStatus === "GRAY_MARKET"
                    ? "Gray Market"
                    : c.legalStatus === "SCHEDULED"
                      ? "Scheduled"
                      : c.legalStatus === "RESEARCH_ONLY"
                      ? "Research Only"
                      : c.legalStatus}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed min-h-[3.15rem]">
            {c.mechanismShort || "Mechanism summary coming soon from research sync."}
          </p>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border bg-muted/30 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Evidence
              </p>
              <p className="font-medium text-foreground">{evidenceTier}</p>
            </div>
            <div className="rounded-md border bg-muted/30 px-2 py-1.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Safety
              </p>
              <p className="font-medium text-foreground">{safetyTier}</p>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-dashed pt-2">
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              {c.studyCount > 0 ? `${c.studyCount} studies` : "No studies yet"}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {c.safetyScore != null ? `${Math.round(c.safetyScore)}/100` : "n/a"}
            </span>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Last sync: {c.lastResearchSync ? new Date(c.lastResearchSync).toLocaleDateString() : "never"}
            {c.lastReviewedAt ? ` · reviewed ${new Date(c.lastReviewedAt).toLocaleDateString()}` : ""}
          </p>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              {c.doseTypical && c.doseUnit
                ? `${c.doseTypical}${c.doseUnit}${c.doseFrequency ? ` · ${c.doseFrequency}` : ""}`
                : "Dose data limited"}
            </span>
            <span className="inline-flex items-center gap-1 text-foreground group-hover:text-primary transition-colors">
              View
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
