"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitFork, RefreshCw, ArrowUp, ArrowDown, AlertTriangle, Flame, Minus, Snowflake } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { trpc } from "@/lib/trpc/client";
import { GoalBadge } from "./GoalBadge";
import { formatCategory } from "@/lib/utils";
import { UpvoteButton } from "./UpvoteButton";
import type { StackSummary } from "./types";
import {
  communityScore,
  communityTrend,
  evidenceConfidence,
  stackCommunityStale,
  stackEvidenceStale,
  topCaveats,
} from "@/lib/stack-metadata";

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
  currentUserId?: string;
  canReorder?: boolean;
}

export function StackCard({ stack, currentUserId, canReorder = false }: Props) {
  const router = useRouter();
  const experience = parseExperience(stack.name);
  const variant = parseVariant(stack.name);
  const isOwner = !!currentUserId && stack.creatorId === currentUserId;
  const confidence = evidenceConfidence(stack.evidenceScore);
  const trend = communityTrend(stack);
  const community = Math.round(communityScore(stack));
  const staleEvidence = stackEvidenceStale(stack);
  const staleCommunity = stackCommunityStale(stack);
  const caveats = topCaveats(stack);

  const reorder = trpc.stack.reorder.useMutation({
    onSuccess: () => router.refresh(),
  });

  return (
    <div className="group h-full">
      <Card className="h-full transition-all duration-150 group-hover:border-zinc-400 dark:group-hover:border-zinc-500 group-hover:shadow-md">
        <Link href={`/stacks/${stack.slug}`} className="block">
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-foreground">
                {stack.name}
              </h3>
              <EvidenceScoreBadge score={stack.evidenceScore} className="shrink-0 mt-0.5" />
            </div>

            <div className="flex items-center gap-1 flex-wrap">
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
            </div>

            <div className="flex flex-wrap gap-1 mt-1">
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px]">Community {community}</span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] gap-1">
                {trend === "rising" ? <Flame className="h-2.5 w-2.5" /> : trend === "steady" ? <Minus className="h-2.5 w-2.5" /> : <Snowflake className="h-2.5 w-2.5" />}
                {trend}
              </span>
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px]">Confidence: {confidence}</span>
              {staleEvidence && (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-700 px-2 py-0.5 text-[10px]">
                  Stale evidence
                </span>
              )}
              {staleCommunity && (
                <span className="inline-flex items-center rounded-full bg-amber-500/10 text-amber-700 px-2 py-0.5 text-[10px]">
                  Stale signal
                </span>
              )}
            </div>

            {stack.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                {stack.description}
              </p>
            )}
          </CardHeader>

          <CardContent className="px-4 pb-4 space-y-3">
            {caveats.length > 0 && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">
                  Caveats to verify
                </p>
                <ul className="space-y-1">
                  {caveats.slice(0, 2).map((c) => (
                    <li key={c} className="text-xs text-amber-800/90 dark:text-amber-200/90 line-clamp-1">
                      • {c}
                    </li>
                  ))}
                </ul>
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

            <p className="text-[10px] text-muted-foreground border-t border-dashed pt-2">
              Safety/evidence metadata only. Not medical advice.
            </p>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
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
                {isOwner && canReorder && (
                  <span className="inline-flex items-center gap-1 ml-1">
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
                  </span>
                )}
              </div>
              <span className="truncate max-w-[120px] text-right">{stack.creator.name ?? "anonymous"}</span>
            </div>
          </CardContent>
        </Link>
      </Card>
    </div>
  );
}
