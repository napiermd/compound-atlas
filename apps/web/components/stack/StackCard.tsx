"use client";

import Link from "next/link";
import { GitFork, Timer, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { GoalBadge } from "./GoalBadge";
import { UpvoteButton } from "./UpvoteButton";
import type { StackSummary } from "./types";

function parseExperience(name: string): string | null {
  if (name.startsWith("Beginner")) return "Beginner";
  if (name.startsWith("Intermediate")) return "Intermediate";
  if (name.startsWith("Advanced")) return "Advanced";
  return null;
}

function parseVariant(name: string): string | null {
  const match = name.match(/\s—\s(.+)$/);
  return match?.[1] ?? null;
}

interface Props {
  stack: StackSummary;
}

export function StackCard({ stack }: Props) {
  const experience = parseExperience(stack.name);
  const variant = parseVariant(stack.name);

  return (
    <div className="group h-full">
      <Card className="h-full transition-all duration-150 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 group-hover:shadow-md">
        <Link href={`/stacks/${stack.slug}`} className="block">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-foreground">
                {stack.name}
              </h3>
              <EvidenceScoreBadge
                score={stack.evidenceScore}
                className="shrink-0 mt-0.5"
              />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <GoalBadge goal={stack.goal} className="w-fit" />
              {experience && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {experience}
                </Badge>
              )}
              {variant && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  {variant}
                </Badge>
              )}
            </div>
            {stack.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                {stack.description}
              </p>
            )}
          </CardHeader>

          <CardContent className="px-4 pb-4 space-y-3">
            {/* Compound pills */}
            {stack.compounds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {stack.compounds.slice(0, 5).map((sc) => (
                  <span
                    key={sc.id}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {sc.compound.name}
                  </span>
                ))}
                {stack.compounds.length > 5 && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    +{stack.compounds.length - 5} more
                  </span>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-dashed pt-2">
              <div className="flex items-center gap-2">
                {stack.durationWeeks && (
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    {stack.durationWeeks}w
                  </span>
                )}
                <UpvoteButton
                  stackId={stack.id}
                  initialCount={stack.upvotes}
                  initialHasUpvoted={stack.userHasUpvoted ?? false}
                  size="sm"
                />
                <span className="flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  {stack._count.forks}
                </span>
                {stack._count.cycles > 0 && (
                  <span className="flex items-center gap-1">
                    <RefreshCw className="h-3 w-3" />
                    {stack._count.cycles}
                  </span>
                )}
              </div>
              <span className="truncate max-w-[120px] text-right">
                {stack.creator.name ?? "anonymous"}
              </span>
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
