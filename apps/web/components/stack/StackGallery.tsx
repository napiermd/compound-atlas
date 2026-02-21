"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { StackGoal } from "@prisma/client";
import { Input } from "@/components/ui/input";
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

const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
const VARIANTS = ["Core", "Low-Side", "Conservative"] as const;

interface Props {
  stacks: StackSummary[];
}

export function StackGallery({ stacks }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<StackGoal | "ALL">("ALL");
  const [selectedExp, setSelectedExp] = useState<string | "ALL">("ALL");
  const [selectedVariant, setSelectedVariant] = useState<string | "ALL">("ALL");
  const [search, setSearch] = useState("");
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

  const presentExperiences = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stacks) {
      const exp = parseExperience(s.name);
      if (exp) counts.set(exp, (counts.get(exp) ?? 0) + 1);
    }
    return EXPERIENCE_LEVELS.filter((e) => counts.has(e)).map((e) => ({
      level: e,
      count: counts.get(e)!,
    }));
  }, [stacks]);

  const presentVariants = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of stacks) {
      const v = parseVariant(s.name);
      if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    }
    return VARIANTS.filter((v) => counts.has(v)).map((v) => ({
      variant: v,
      count: counts.get(v)!,
    }));
  }, [stacks]);

  const filtered = useMemo(() => {
    let result = stacks;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    if (selectedGoal !== "ALL") {
      result = result.filter((s) => s.goal === selectedGoal);
    }

    if (selectedExp !== "ALL") {
      result = result.filter(
        (s) => parseExperience(s.name) === selectedExp
      );
    }

    if (selectedVariant !== "ALL") {
      result = result.filter(
        (s) => parseVariant(s.name) === selectedVariant
      );
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
  }, [stacks, search, selectedGoal, selectedExp, selectedVariant, sortBy]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search stacks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
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

      {/* Experience level filter */}
      {presentExperiences.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground leading-6 mr-1">Level:</span>
          <button
            onClick={() => setSelectedExp("ALL")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedExp === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            All
          </button>
          {presentExperiences.map(({ level, count }) => (
            <button
              key={level}
              onClick={() => setSelectedExp(level)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedExp === level
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {level} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Variant filter */}
      {presentVariants.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground leading-6 mr-1">Variant:</span>
          <button
            onClick={() => setSelectedVariant("ALL")}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              selectedVariant === "ALL"
                ? "bg-primary text-primary-foreground"
                : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            All
          </button>
          {presentVariants.map(({ variant, count }) => (
            <button
              key={variant}
              onClick={() => setSelectedVariant(variant)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedVariant === variant
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80 text-muted-foreground"
              )}
            >
              {variant} ({count})
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} stack{filtered.length !== 1 ? "s" : ""}
        {selectedGoal !== "ALL"
          ? ` · ${formatCategory(selectedGoal as string)}`
          : ""}
        {selectedExp !== "ALL" ? ` · ${selectedExp}` : ""}
        {selectedVariant !== "ALL" ? ` · ${selectedVariant}` : ""}
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
