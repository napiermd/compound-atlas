"use client";

import Link from "next/link";
import {
  Target,
  Shield,
  FlaskConical,
  TrendingUp,
  AlertTriangle,
  Settings,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc/client";

function ScoreBar({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const color =
    value >= 70
      ? "bg-green-500"
      : value >= 40
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="w-20 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="w-8 text-right font-mono">{value}</span>
    </div>
  );
}

export function PersonalizedStacks() {
  const { data, isLoading, error } =
    trpc.personalizedStacks.recommend.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Scoring stacks for your profile...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-24 text-center text-destructive">
        <p className="text-sm">Failed to load recommendations. {error.message}</p>
      </div>
    );
  }

  if (!data || data.stacks.length === 0) {
    return (
      <div className="py-24 text-center text-muted-foreground">
        <p className="text-sm">
          No public stacks available yet. Check back soon or{" "}
          <Link href="/stacks/new" className="underline underline-offset-2">
            build one
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.stacks.length} stacks ranked for you
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/profile/setup">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Edit Profile
          </Link>
        </Button>
      </div>

      <div className="grid gap-4">
        {data.stacks.map((scored, i) => (
          <Card key={scored.stack.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-muted-foreground/50">
                      #{i + 1}
                    </span>
                    <CardTitle className="text-lg">
                      <Link
                        href={`/stacks/${scored.stack.slug}`}
                        className="hover:underline"
                      >
                        {scored.stack.name}
                      </Link>
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {scored.stack.goal.replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {scored.stack.compounds.length} compounds
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums">
                    {scored.totalScore}
                  </div>
                  <div className="text-xs text-muted-foreground">match score</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Score breakdown */}
              <div className="space-y-1.5">
                <ScoreBar label="Goal fit" value={scored.goalFit} icon={Target} />
                <ScoreBar
                  label="Evidence"
                  value={Math.round(scored.evidenceFit)}
                  icon={FlaskConical}
                />
                <ScoreBar label="Safety" value={scored.safetyFit} icon={Shield} />
                <ScoreBar
                  label="Phenotype"
                  value={scored.phenotypeFit}
                  icon={TrendingUp}
                />
              </div>

              {/* Reasons */}
              {scored.reasons.length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-1.5">
                    {scored.reasons.map((r) => (
                      <Badge key={r} variant="outline" className="text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                </>
              )}

              {/* Warnings */}
              {scored.warnings.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    {scored.warnings.map((w) => (
                      <div
                        key={w}
                        className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        {w}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Compounds preview */}
              <Separator />
              <div className="flex flex-wrap gap-1.5">
                {scored.stack.compounds.map((c) => (
                  <Badge key={c.compound.slug} variant="secondary" className="text-xs">
                    {c.compound.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
