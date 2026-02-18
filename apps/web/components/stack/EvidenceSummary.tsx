import { Card, CardContent } from "@/components/ui/card";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import type { StackedCompound } from "./types";

interface Props {
  compounds: StackedCompound[];
}

export function EvidenceSummary({ compounds }: Props) {
  const scored = compounds.filter((c) => c.evidenceScore != null);
  const avg =
    scored.length > 0
      ? scored.reduce((sum, c) => sum + c.evidenceScore!, 0) / scored.length
      : null;

  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Composite Evidence Score</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {scored.length === 0
                ? "No research data available for selected compounds"
                : `Based on ${scored.length} of ${compounds.length} compound${
                    compounds.length !== 1 ? "s" : ""
                  } with research data`}
            </p>
          </div>
          <EvidenceScoreBadge score={avg} size="lg" />
        </div>
      </CardContent>
    </Card>
  );
}
