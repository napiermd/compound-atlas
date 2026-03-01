"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import type { StackCategory, StackGoal } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCategory } from "@/lib/utils";
import { applyStackFilters, getCategoryCounts, getFolderCounts, getRiskCounts, getTagCounts, type SortKey } from "@/lib/stack-gallery";
import { StackCard } from "./StackCard";
import type { StackSummary } from "./types";
import { NOOTROPIC_TEMPLATES, type NootropicTemplateKey, isNootropicStack, matchesTemplate } from "@/lib/nootropic-templates";
import { communityScore, communityTrend, evidenceConfidence, stackEvidenceStale, topCaveats } from "@/lib/stack-metadata";

interface Props {
  stacks: StackSummary[];
  currentUserId?: string;
}

const ANABOLIC_GOALS: StackGoal[] = [
  "BULK",
  "CUT",
  "RECOMP",
  "HORMONE_OPTIMIZATION",
  "LIBIDO",
  "ATHLETIC_PERFORMANCE",
];

const NOOTROPIC_GOALS: StackGoal[] = ["COGNITIVE", "SLEEP", "MOOD"];
const LONGEVITY_RECOVERY_GOALS: StackGoal[] = ["LONGEVITY", "RECOVERY", "JOINT_HEALTH", "GENERAL_HEALTH"];

export function StackGallery({ stacks, currentUserId }: Props) {
  const [selectedGoal, setSelectedGoal] = useState<StackGoal | "ALL">("ALL");
  const [selectedCategory, setSelectedCategory] = useState<StackCategory | "ALL">("ALL");
  const [selectedFolder, setSelectedFolder] = useState<string | "ALL">("ALL");
  const [selectedTag, setSelectedTag] = useState<string | "ALL">("ALL");
  const [selectedRisk, setSelectedRisk] = useState<string | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("community");
  const [template, setTemplate] = useState<NootropicTemplateKey>("focus");
  const [anabolicOnly, setAnabolicOnly] = useState(true);

  const presentGoals = useMemo(() => {
    const counts = new Map<StackGoal, number>();
    for (const s of stacks) counts.set(s.goal, (counts.get(s.goal) ?? 0) + 1);
    return Array.from(counts.entries()).map(([goal, count]) => ({ goal, count }));
  }, [stacks]);

  const categories = useMemo(() => getCategoryCounts(stacks), [stacks]);
  const folders = useMemo(() => getFolderCounts(stacks), [stacks]);
  const tags = useMemo(() => getTagCounts(stacks), [stacks]);
  const risks = useMemo(() => getRiskCounts(stacks), [stacks]);

  const filtered = useMemo(() => {
    const base = applyStackFilters(stacks, {
      search,
      goal: selectedGoal,
      category: selectedCategory,
      folder: selectedFolder,
      tag: selectedTag,
      risk: selectedRisk,
      sortBy,
    });
    if (!anabolicOnly) return base;
    return base.filter((s) => ANABOLIC_GOALS.includes(s.goal));
  }, [stacks, search, selectedGoal, selectedCategory, selectedFolder, selectedTag, selectedRisk, sortBy, anabolicOnly]);

  const templateStacks = useMemo(() => {
    return stacks
      .filter((s) => isNootropicStack(s) && matchesTemplate(s, template))
      .sort((a, b) => communityScore(b) - communityScore(a))
      .slice(0, 6);
  }, [stacks, template]);

  const hasNootropicSignals = useMemo(
    () => templateStacks.some((s) => Math.round(communityScore(s)) > 0),
    [templateStacks]
  );

  const communityPulse = useMemo(() => {
    const trending = [...stacks]
      .filter((s) => communityScore(s) > 0)
      .sort((a, b) => communityScore(b) - communityScore(a))
      .slice(0, 5);

    const anabolicTrending = [...stacks]
      .filter((s) => ANABOLIC_GOALS.includes(s.goal) && communityScore(s) > 0)
      .sort((a, b) => communityScore(b) - communityScore(a))
      .slice(0, 5);

    return { trending, anabolicTrending };
  }, [stacks]);

  const sectioned = useMemo(() => {
    const anabolic = filtered.filter((s) => ANABOLIC_GOALS.includes(s.goal));
    const nootropic = filtered.filter((s) => NOOTROPIC_GOALS.includes(s.goal));
    const longevityRecovery = filtered.filter((s) => LONGEVITY_RECOVERY_GOALS.includes(s.goal));
    const used = new Set([...anabolic, ...nootropic, ...longevityRecovery].map((s) => s.id));
    const other = filtered.filter((s) => !used.has(s.id));

    return [
      { key: "anabolic", title: "Anabolic", stacks: anabolic },
      { key: "nootropic", title: "Nootropic", stacks: nootropic },
      { key: "longevity", title: "Longevity & Recovery", stacks: longevityRecovery },
      { key: "other", title: "Other", stacks: other },
    ].filter((section) => section.stacks.length > 0);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {hasNootropicSignals && (
      <div className="rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <p className="text-sm font-semibold">Nootropics quick compare</p>
            <p className="text-xs text-muted-foreground">Focus on signal, confidence, freshness, and caveats.</p>
          </div>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(NOOTROPIC_TEMPLATES) as NootropicTemplateKey[]).map((key) => (
              <button
                key={key}
                onClick={() => setTemplate(key)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  template === key ? "bg-primary text-primary-foreground" : "bg-background border text-muted-foreground hover:text-foreground"
                )}
              >
                {NOOTROPIC_TEMPLATES[key].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-2 pr-3">Stack</th>
                <th className="text-left py-2 pr-3">Community signal</th>
                <th className="text-left py-2 pr-3">Trend</th>
                <th className="text-left py-2 pr-3">Confidence</th>
                <th className="text-left py-2 pr-3">Freshness</th>
                <th className="text-left py-2">Caveats</th>
              </tr>
            </thead>
            <tbody>
              {templateStacks.map((s) => {
                const caveatCount = topCaveats(s).length;
                const evidenceStale = stackEvidenceStale(s);
                return (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 font-medium">
                      <Link href={`/stacks/${s.slug}`} className="hover:underline">
                        {s.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{Math.round(communityScore(s))}</td>
                    <td className="py-2 pr-3 capitalize">{communityTrend(s)}</td>
                    <td className="py-2 pr-3">{evidenceConfidence(s.evidenceScore)}</td>
                    <td className="py-2 pr-3">{evidenceStale ? "Stale" : "Current"}</td>
                    <td className="py-2">
                      {caveatCount > 0 ? (
                        <span className="text-amber-700 dark:text-amber-400">{caveatCount} flagged</span>
                      ) : (
                        <span className="text-muted-foreground">none listed</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {templateStacks.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-muted-foreground">
                    No matching stacks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {(communityPulse.trending.length > 0 || communityPulse.anabolicTrending.length > 0) && (
        <div className="rounded-lg border bg-muted/20 p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Community pulse</p>
            <span className="text-xs text-muted-foreground">Reddit + X</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="font-medium mb-1">Trending this week</p>
              <ul className="space-y-1">
                {communityPulse.trending.map((s) => (
                  <li key={`trend-${s.id}`}>
                    <Link href={`/stacks/${s.slug}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-medium mb-1">Most discussed anabolic</p>
              <ul className="space-y-1">
                {communityPulse.anabolicTrending.map((s) => (
                  <li key={`anabolic-${s.id}`}>
                    <Link href={`/stacks/${s.slug}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAnabolicOnly(false)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              !anabolicOnly ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            All stacks
          </button>
          <button
            onClick={() => setAnabolicOnly(true)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition-colors",
              anabolicOnly ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            Anabolic view
          </button>
        </div>
        {anabolicOnly && (
          <p className="text-xs text-muted-foreground">Showing bulk/cut/recomp/hormone/libido/performance stacks</p>
        )}
      </div>

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
            <SelectItem value="community">Trending (community)</SelectItem>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="evidenceScore">Highest evidence</SelectItem>
            <SelectItem value="upvotes">Most upvoted</SelectItem>
            <SelectItem value="cycles">Most run (cycles)</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
        <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as StackCategory | "ALL")}>
          <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.category} value={c.category}>{formatCategory(c.category)} ({c.count})</SelectItem>)}
          </SelectContent>
        </Select>
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

      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <p className="text-sm">No stacks found.</p>
          <Link href="/stacks/new" className="text-sm underline underline-offset-2 hover:text-foreground mt-1 block">Build the first one</Link>
        </div>
      ) : (
        <div className="space-y-6">
          {sectioned.map((section) => (
            <section key={section.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">{section.title}</h2>
                <span className="text-xs text-muted-foreground">{section.stacks.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {section.stacks.map((s) => (
                  <StackCard key={s.id} stack={s} currentUserId={currentUserId} canReorder={sortBy === "custom"} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
