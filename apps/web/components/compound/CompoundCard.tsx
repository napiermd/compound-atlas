import Link from "next/link";
import { FlaskConical } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { CategoryBadge } from "./CategoryBadge";
import { EvidenceScoreBadge } from "./EvidenceScoreBadge";
import type { CompoundSummary } from "./types";

interface Props {
  compound: CompoundSummary;
}

export function CompoundCard({ compound: c }: Props) {
  return (
    <Link href={`/compounds/${c.slug}`} className="group block h-full">
      <Card className="h-full transition-all duration-150 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 group-hover:shadow-md">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-foreground">
              {c.name}
            </h3>
            <EvidenceScoreBadge score={c.evidenceScore} className="shrink-0 mt-0.5" />
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5">
            <CategoryBadge category={c.category} />
            {c.legalStatus !== "LEGAL" && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                {c.legalStatus === "PRESCRIPTION"
                  ? "Rx"
                  : c.legalStatus === "GRAY_MARKET"
                    ? "Gray Market"
                    : c.legalStatus === "SCHEDULED"
                      ? "Scheduled"
                      : c.legalStatus === "RESEARCH_ONLY"
                        ? "Research Only"
                        : c.legalStatus}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-4 space-y-2">
          {c.mechanismShort && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {c.mechanismShort}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-dashed">
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3 w-3" />
              {c.studyCount > 0 ? `${c.studyCount} studies` : "No studies yet"}
            </span>
            {c.doseTypical && c.doseUnit && (
              <span className="tabular-nums font-mono">
                {c.doseTypical}
                {c.doseUnit}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
