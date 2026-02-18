"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { StackGoal } from "@prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCategory } from "@/lib/utils";
import { StackCard } from "./StackCard";
import type { StackSummary } from "./types";

type SortKey = "newest" | "evidenceScore" | "upvotes";

interface Props {
  stacks: StackSummary[];
}

export function StackGallery({ stacks }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<StackGoal | "ALL">("ALL");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const presentGoals = useMemo(() => {
    const counts = new Map<StackGoal, number>();
    for (const s of stacks) {
      counts.set(s.goal, (counts.get(s.goal) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([goal, count]) => ({ goal, count }));
  }, [stacks]);

  const filtered = useMemo(() => {
    let result = stacks;
    if (selectedGoal !== "ALL") {
      result = result.filter((s) => s.goal === selectedGoal);
    }
    return [...result].sort((a, b) => {
      if (sortBy === "newest") {
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
      if (sortBy === "evidenceScore") {
        if (a.evidenceScore == null && b.evidenceScore == null) return 0;
        if (a.evidenceScore == null) return 1;
        if (b.evidenceScore == null) return -1;
        return b.evidenceScore - a.evidenceScore;
      }
      return b.upvotes - a.upvotes;
    });
  }, [stacks, selectedGoal, sortBy]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        {/* Goal filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setSelectedGoal("ALL")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedGoal === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            All ({stacks.length})
          </button>
          {presentGoals.map(({ goal, count }) => (
            <button
              key={goal}
              onClick={() => setSelectedGoal(goal)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors",
                selectedGoal === goal
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {formatCategory(goal)} ({count})
            </button>
          ))}
        </div>

        {/* Sort */}
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="evidenceScore">Highest evidence</SelectItem>
            <SelectItem value="upvotes">Most upvoted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} stack{filtered.length !== 1 ? "s" : ""}
        {selectedGoal !== "ALL"
          ? ` · ${formatCategory(selectedGoal as string)}`
          : ""}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <StackCard key={s.id} stack={s} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <p className="text-sm">No stacks found.</p>
            <Link
              href="/stacks/new"
              className="text-sm underline underline-offset-2 hover:text-foreground mt-1 block"
            >
              Build the first one
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
