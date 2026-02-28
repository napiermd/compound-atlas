"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import {
  GitFork,
  Timer,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Activity,
  Clock3,
} from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { trpc } from "@/lib/trpc/client";
import { GoalBadge } from "./GoalBadge";
import { formatCategory } from "@/lib/utils";
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

const GOAL_INTENT_COPY: Partial<Record<StackSummary["goal"], string>> = {
  BULK: "For size and strength phases.",
  CUT: "For fat-loss phases while preserving lean mass.",
  RECOMP: "For body recomposition without extreme swings.",
  RECOVERY: "For recovery-heavy training blocks.",
};

function formatFreshness(createdAt: string): string {
  try {
    return formatDistanceToNowStrict(new Date(createdAt), { addSuffix: true });
  } catch {
    return "recent";
  }
}

interface Props {
  stack: StackSummary;
  currentUserId?: string;
  canReorder?: boolean;
}

export function StackCard({ stack, currentUserId, canReorder = false }: Props) {
  const router = useRouter();
  const experience = parseExperience(stack.name);
  const variant = parseVariant(stack.name);
  const isOwner = !!currentUserId && stack.creatorId === currentUserId;

  const reorder = trpc.stack.reorder.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="group h-full">
      <Card className="h-full transition-all duration-150 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 group-hover:shadow-md">
        <Link href={`/stacks/${stack.slug}`} className="block h-full">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-foreground">
                  {stack.name}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {GOAL_INTENT_COPY[stack.goal] ?? "Community protocol template."}
                </p>
              </div>
              <EvidenceScoreBadge score={stack.evidenceScore} className="shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center gap-1 flex-wrap mt-2">
              <GoalBadge goal={stack.goal} className="w-fit" />
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                {formatCategory(stack.category)}
              </Badge>
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
              {stack.folder && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                  📁 {stack.folder}
                </Badge>
              )}
            </div>

            {stack.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {stack.description}
              </p>
            )}
          </CardHeader>

          <CardContent className="px-4 pb-4 space-y-3">
            {stack.compounds.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {stack.compounds.slice(0, 4).map((sc) => (
                  <span
                    key={sc.id}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    {sc.compound.name}
                  </span>
                ))}
                {stack.compounds.length > 4 && (
                  <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    +{stack.compounds.length - 4} more
                  </span>
                )}
              </div>
            )}

            {(stack.riskFlags?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-1">
                {stack.riskFlags!.slice(0, 2).map((flag) => (
                  <span
                    key={flag}
                    className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 text-xs"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {flag}
                  </span>
                ))}
              </div>
            )}

            <div className="rounded-md border bg-muted/20 px-2.5 py-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  Trend
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {formatFreshness(stack.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs mt-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
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
                  {stack.durationWeeks && (
                    <span className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      {stack.durationWeeks}w
                    </span>
                  )}
                </div>
                <span className="truncate max-w-[120px] text-right text-muted-foreground">
                  {stack.creator.name ?? "anonymous"}
                </span>
              </div>
            </div>

            {isOwner && canReorder && (
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    reorder.mutate({ stackId: stack.id, direction: "up" });
                  }}
                  className="rounded border p-0.5 hover:bg-accent"
                  aria-label="Move up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    reorder.mutate({ stackId: stack.id, direction: "down" });
                  }}
                  className="rounded border p-0.5 hover:bg-accent"
                  aria-label="Move down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            )}
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
