import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CompoundDetail } from "./types";

interface Props {
  compound: Pick<
    CompoundDetail,
    "doseMin" | "doseTypical" | "doseMax" | "doseUnit" | "doseFrequency"
  >;
}

export function DosingCard({ compound: c }: Props) {
  const hasData = c.doseTypical != null || c.doseMin != null;

  // Compute progress bar fill: typical dose relative to range
  let progressPct = 0;
  if (c.doseMin != null && c.doseMax != null && c.doseTypical != null) {
    const range = c.doseMax - c.doseMin;
    progressPct =
      range > 0
        ? Math.round(((c.doseTypical - c.doseMin) / range) * 100)
        : 50;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Dosing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {!hasData ? (
          <p className="text-muted-foreground text-xs">No dosing data yet</p>
        ) : (
          <>
            {c.doseTypical != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typical</span>
                <span className="font-semibold tabular-nums">
                  {c.doseTypical} {c.doseUnit}
                </span>
              </div>
            )}
            {c.doseMin != null && c.doseMax != null && (
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-muted-foreground text-xs">
                    {c.doseMin} {c.doseUnit}
                  </span>
                  <span className="text-muted-foreground text-xs font-medium">
                    Range
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {c.doseMax} {c.doseUnit}
                  </span>
                </div>
                {c.doseTypical != null && (
                  <Progress value={progressPct} className="h-1.5" />
                )}
              </div>
            )}
            {c.doseFrequency && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="text-right max-w-[60%]">
                  {c.doseFrequency}
                </span>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
