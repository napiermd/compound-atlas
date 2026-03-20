"use client";

import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Target,
  Shield,
  FlaskConical,
  TrendingUp,
} from "lucide-react";

function formatGoal(goal: string) {
  return goal.toLowerCase().replace(/_/g, " ");
}

function scoreColor(score: number) {
  if (score >= 75) return "text-green-600";
  if (score >= 50) return "text-yellow-600";
  return "text-red-500";
}

export function PersonalizedStacks() {
  const { data, isLoading } = trpc.personalizedStacks.recommend.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  if (!data?.hasProfile) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-semibold mb-2">
            Set Up Your Profile First
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            We need to know about your health goals, body composition, and lab
            results to make personalized recommendations.
          </p>
          <Button asChild>
            <Link href="/profile/setup">Set Up Profile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.stacks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-sm text-muted-foreground">
            No public stacks available yet. Check back soon or{" "}
            <Link href="/stacks/new" className="underline hover:text-foreground">
              build your own
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {data.stacks.map((scored, i) => (
        <Card key={scored.stack.id} className="overflow-hidden">
          <div className="flex">
            {/* Rank badge */}
            <div className="flex items-center justify-center w-14 bg-muted/50 border-r text-lg font-bold text-muted-foreground">
              #{i + 1}
            </div>

            <div className="flex-1">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">
                      <Link
                        href={`/stacks/${scored.stack.slug}`}
                        className="hover:underline"
                      >
                        {scored.stack.name}
                      </Link>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {formatGoal(scored.stack.goal)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {scored.stack.compounds.length} compound
                        {scored.stack.compounds.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-2xl font-bold ${scoreColor(scored.totalScore)}`}
                    >
                      {scored.totalScore}
                    </div>
                    <p className="text-xs text-muted-foreground">match score</p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Score breakdown */}
                <div className="grid grid-cols-5 gap-3 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Target className="h-3 w-3" />
                      Goal
                    </div>
                    <Progress value={scored.goalFit} className="h-1.5" />
                    <span className="text-muted-foreground">
                      {scored.goalFit}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <FlaskConical className="h-3 w-3" />
                      Evidence
                    </div>
                    <Progress value={scored.evidenceFit} className="h-1.5" />
                    <span className="text-muted-foreground">
                      {scored.evidenceFit}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <Shield className="h-3 w-3" />
                      Safety
                    </div>
                    <Progress value={scored.safetyFit} className="h-1.5" />
                    <span className="text-muted-foreground">
                      {scored.safetyFit}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <TrendingUp className="h-3 w-3" />
                      Phenotype
                    </div>
                    <Progress value={scored.phenotypeFit} className="h-1.5" />
                    <span className="text-muted-foreground">
                      {scored.phenotypeFit}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-muted-foreground mb-1">
                      <FlaskConical className="h-3 w-3" />
                      Labs
                    </div>
                    <Progress value={scored.labFit} className="h-1.5" />
                    <span className="text-muted-foreground">
                      {scored.labFit}
                    </span>
                  </div>
                </div>

                {/* Reasons */}
                {scored.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {scored.reasons.map((r, j) => (
                      <Badge key={j} variant="secondary" className="text-xs">
                        {r}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {scored.warnings.length > 0 && (
                  <div className="space-y-1">
                    {scored.warnings.map((w, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-1.5 text-xs text-amber-600"
                      >
                        <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {/* Compounds list */}
                <div className="flex flex-wrap gap-1.5">
                  {scored.stack.compounds.map((sc) => (
                    <Badge
                      key={sc.compound.id}
                      variant="outline"
                      className="text-xs"
                    >
                      {sc.compound.name}
                      {sc.dose ? ` ${sc.dose}${sc.unit ?? ""}` : ""}
                    </Badge>
                  ))}
                </div>

                <div className="pt-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/stacks/${scored.stack.slug}`}>
                      View Stack
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
