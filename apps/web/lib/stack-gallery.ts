import type { StackGoal } from "@prisma/client";
import type { StackSummary } from "../components/stack/types";

export type SortKey = "newest" | "evidenceScore" | "upvotes" | "custom";

export interface StackFilters {
  search: string;
  goal: StackGoal | "ALL";
  folder: string | "ALL";
  tag: string | "ALL";
  risk: string | "ALL";
  sortBy: SortKey;
}

export function applyStackFilters(stacks: StackSummary[], filters: StackFilters) {
  const q = filters.search.trim().toLowerCase();

  const filtered = stacks.filter((s) => {
    if (q) {
      const haystack = [s.name, s.description ?? "", ...(s.tags ?? []), ...(s.riskFlags ?? [])]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.goal !== "ALL" && s.goal !== filters.goal) return false;
    if (filters.folder !== "ALL" && (s.folder ?? "Unfiled") !== filters.folder) return false;
    if (filters.tag !== "ALL" && !(s.tags ?? []).includes(filters.tag)) return false;
    if (filters.risk !== "ALL" && !(s.riskFlags ?? []).includes(filters.risk)) return false;
    return true;
  });

  return [...filtered].sort((a, b) => {
    if (filters.sortBy === "custom") return (a.orderIndex ?? 0) - (b.orderIndex ?? 0);
    if (filters.sortBy === "evidenceScore") {
      if (a.evidenceScore == null && b.evidenceScore == null) return 0;
      if (a.evidenceScore == null) return 1;
      if (b.evidenceScore == null) return -1;
      return b.evidenceScore - a.evidenceScore;
    }
    if (filters.sortBy === "upvotes") return b.upvotes - a.upvotes;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function getFolderCounts(stacks: StackSummary[]) {
  const map = new Map<string, number>();
  for (const s of stacks) {
    const folder = s.folder ?? "Unfiled";
    map.set(folder, (map.get(folder) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([folder, count]) => ({ folder, count }));
}

export function getTagCounts(stacks: StackSummary[]) {
  const map = new Map<string, number>();
  for (const s of stacks) {
    for (const t of s.tags ?? []) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([tag, count]) => ({ tag, count }));
}

export function getRiskCounts(stacks: StackSummary[]) {
  const map = new Map<string, number>();
  for (const s of stacks) {
    for (const f of s.riskFlags ?? []) map.set(f, (map.get(f) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([risk, count]) => ({ risk, count }));
}
