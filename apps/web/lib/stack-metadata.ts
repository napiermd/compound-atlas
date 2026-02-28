import type { StackSummary } from "@/components/stack/types";

const MS_PER_DAY = 1000 * 60 * 60 * 24;
export const STALE_COMMUNITY_DAYS = 45;
export const STALE_EVIDENCE_DAYS = 90;

export function daysSince(date?: string | Date | null): number | null {
  if (!date) return null;
  const ts = new Date(date).getTime();
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, Math.floor((Date.now() - ts) / MS_PER_DAY));
}

export function evidenceConfidence(score: number | null): "High" | "Moderate" | "Early" | "Limited" {
  if (score == null) return "Limited";
  if (score >= 75) return "High";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Early";
  return "Limited";
}

export function communityScore(stack: StackSummary): number {
  const recencyBoost = Math.max(0.4, 1 - (daysSince(stack.createdAt) ?? 365) / 120);
  return (stack.upvotes * 1.4 + stack._count.forks * 2 + stack._count.cycles * 1.8) * recencyBoost;
}

export function communityTrend(stack: StackSummary): "rising" | "steady" | "cooling" {
  const score = communityScore(stack);
  if (score >= 25) return "rising";
  if (score >= 8) return "steady";
  return "cooling";
}

export function stackEvidenceStale(stack: StackSummary): boolean {
  const newest = stack.compounds
    .map((c) => c.compound.lastReviewedAt ?? c.compound.lastResearchSync)
    .filter(Boolean)
    .sort((a, b) => new Date(b as string).getTime() - new Date(a as string).getTime())[0];
  const age = daysSince(newest ?? null);
  return age == null || age >= STALE_EVIDENCE_DAYS;
}

export function stackCommunityStale(stack: StackSummary): boolean {
  const age = daysSince(stack.updatedAt ?? stack.createdAt);
  return age == null || age >= STALE_COMMUNITY_DAYS;
}
