import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { scaleDose, type UserBiometrics } from "@/lib/dose-utils";
import type { CompoundDetail } from "./types";

interface Props {
  compound: Pick<
    CompoundDetail,
    "doseMin" | "doseTypical" | "doseMax" | "doseUnit" | "doseFrequency"
  >;
  biometrics?: UserBiometrics | null;
}

export function DosingCard({ compound: c, biometrics }: Props) {
  const hasData = c.doseTypical != null || c.doseMin != null;

  const personalizedDose =
    biometrics && c.doseTypical != null
      ? scaleDose(
          c.doseTypical,
          c.doseMin ?? null,
          c.doseMax ?? null,
          biometrics.lbm,
          biometrics.sex,
        )
      : null;

  // Progress bar: personalized dose (if available) or typical, relative to range
  let progressPct = 0;
  const displayDose = personalizedDose ?? c.doseTypical;
  if (c.doseMin != null && c.doseMax != null && displayDose != null) {
    const range = c.doseMax - c.doseMin;
    progressPct =
      range > 0
        ? Math.round(((displayDose - c.doseMin) / range) * 100)
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
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">
                  {personalizedDose != null ? "Your dose" : "Typical"}
                </span>
                <div className="text-right">
                  <span className="font-semibold tabular-nums">
                    {personalizedDose ?? c.doseTypical} {c.doseUnit}
                  </span>
                  {personalizedDose != null && (
                    <div className="flex flex-col items-end gap-0.5 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        Standard: {c.doseTypical} {c.doseUnit}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        Based on your LBM
                      </span>
                    </div>
                  )}
                </div>
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
                {displayDose != null && (
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
            {personalizedDose == null && c.doseTypical != null && (
              <p className="text-xs text-muted-foreground pt-1 border-t">
                Set height &amp; weight in{" "}
                <a href="/settings" className="underline hover:text-foreground transition-colors">
                  Settings
                </a>{" "}
                to see your dose.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
