import Link from "next/link";
import type { StackGoal } from "@prisma/client";
import type { StackSummary } from "./types";
import { evidenceConfidence, communityScore, communityTrend, stackEvidenceStale } from "@/lib/stack-metadata";

function topStacks(stacks: StackSummary[], goal: StackGoal) {
  return stacks
    .filter((s) => s.goal === goal)
    .sort((a, b) => communityScore(b) + (b.evidenceScore ?? 0) - (communityScore(a) + (a.evidenceScore ?? 0)))
    .slice(0, 4);
}

function GoalColumn({ title, stacks }: { title: string; stacks: StackSummary[] }) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {stacks.map((stack) => (
        <Link key={stack.id} href={`/stacks/${stack.slug}`} className="block rounded border p-2 hover:bg-muted/40">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium line-clamp-1">{stack.name}</p>
            <span className="text-[10px] rounded-full bg-muted px-2 py-0.5">{communityTrend(stack)}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Community {Math.round(communityScore(stack))} · {evidenceConfidence(stack.evidenceScore)} confidence
          </p>
          {stackEvidenceStale(stack) && (
            <p className="text-[10px] text-amber-700 mt-1">Evidence data may be stale</p>
          )}
        </Link>
      ))}
      {stacks.length === 0 && <p className="text-xs text-muted-foreground">No templates yet.</p>}
    </div>
  );
}

export function BulkCutComparison({ stacks }: { stacks: StackSummary[] }) {
  const bulk = topStacks(stacks, "BULK");
  const cut = topStacks(stacks, "CUT");

  return (
    <section className="mb-6">
      <div className="mb-2">
        <h2 className="text-lg font-semibold">Bulk vs Cut template comparison</h2>
        <p className="text-xs text-muted-foreground">Metadata only: community signal, evidence confidence, and caveat visibility.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <GoalColumn title="Bulk templates" stacks={bulk} />
        <GoalColumn title="Cut templates" stacks={cut} />
      </div>
    </section>
  );
}
