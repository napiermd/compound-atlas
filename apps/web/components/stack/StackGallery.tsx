"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { StackGoal } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCategory } from "@/lib/utils";
import { applyStackFilters, getFolderCounts, getRiskCounts, getTagCounts, type SortKey } from "@/lib/stack-gallery";
import { StackCard } from "./StackCard";
import type { StackSummary } from "./types";

interface Props {
  stacks: StackSummary[];
  currentUserId?: string;
}

export function StackGallery({ stacks, currentUserId }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<StackGoal | "ALL">("ALL");
  const [selectedFolder, setSelectedFolder] = useState<string | "ALL">("ALL");
  const [selectedTag, setSelectedTag] = useState<string | "ALL">("ALL");
  const [selectedRisk, setSelectedRisk] = useState<string | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("newest");

  const presentGoals = useMemo(() => {
    const counts = new Map<StackGoal, number>();
    for (const s of stacks) counts.set(s.goal, (counts.get(s.goal) ?? 0) + 1);
    return Array.from(counts.entries()).map(([goal, count]) => ({ goal, count }));
  }, [stacks]);

  const folders = useMemo(() => getFolderCounts(stacks), [stacks]);
  const tags = useMemo(() => getTagCounts(stacks), [stacks]);
  const risks = useMemo(() => getRiskCounts(stacks), [stacks]);

  const filtered = useMemo(
    () =>
      applyStackFilters(stacks, {
        search,
        goal: selectedGoal,
        folder: selectedFolder,
        tag: selectedTag,
        risk: selectedRisk,
        sortBy,
      }),
    [stacks, search, selectedGoal, selectedFolder, selectedTag, selectedRisk, sortBy]
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search stacks, tags, or risk flags..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-52 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="evidenceScore">Highest evidence</SelectItem>
            <SelectItem value="upvotes">Most upvoted</SelectItem>
            <SelectItem value="custom">Custom order</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setSelectedGoal("ALL")} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", selectedGoal === "ALL" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground")}>
          All ({stacks.length})
        </button>
        {presentGoals.map(({ goal, count }) => (
          <button key={goal} onClick={() => setSelectedGoal(goal)} className={cn("rounded-full px-3 py-1 text-xs font-medium transition-colors", selectedGoal === goal ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground")}>
            {formatCategory(goal)} ({count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <Select value={selectedFolder} onValueChange={(v) => setSelectedFolder(v)}>
          <SelectTrigger><SelectValue placeholder="Folder" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All folders</SelectItem>
            {folders.map((f) => <SelectItem key={f.folder} value={f.folder}>{f.folder} ({f.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedTag} onValueChange={(v) => setSelectedTag(v)}>
          <SelectTrigger><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All tags</SelectItem>
            {tags.map((t) => <SelectItem key={t.tag} value={t.tag}>#{t.tag} ({t.count})</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedRisk} onValueChange={(v) => setSelectedRisk(v)}>
          <SelectTrigger><SelectValue placeholder="Risk flag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All risk flags</SelectItem>
            {risks.map((r) => <SelectItem key={r.risk} value={r.risk}>{r.risk} ({r.count})</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{filtered.length} stack{filtered.length !== 1 ? "s" : ""}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <StackCard key={s.id} stack={s} currentUserId={currentUserId} canReorder={sortBy === "custom"} />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full py-16 text-center text-muted-foreground">
            <p className="text-sm">No stacks found.</p>
            <Link href="/stacks/new" className="text-sm underline underline-offset-2 hover:text-foreground mt-1 block">Build the first one</Link>
          </div>
        )}
      </div>
    </div>
  );
}
