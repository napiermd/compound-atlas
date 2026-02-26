import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { CycleCard } from "@/components/cycle/CycleCard";
import { SectionNav } from "@/components/layout/SectionNav";
import type { CycleSummary } from "@/components/cycle/types";

export const metadata: Metadata = {
  title: "My Cycles — CompoundAtlas",
};

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = await db.cycle.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      stack: { select: { name: true, slug: true } },
      _count: { select: { entries: true } },
      entries: {
        orderBy: { date: "desc" },
        take: 1,
        select: { date: true },
      },
    },
  });

  // Serialize dates; JSON round-trip converts Date → ISO string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const serialized: any[] = JSON.parse(JSON.stringify(raw));

  const cycles: CycleSummary[] = serialized.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status as CycleSummary["status"],
    startDate: c.startDate ?? null,
    endDate: c.endDate ?? null,
    stack: c.stack ?? null,
    _count: c._count,
    lastEntryDate: c.entries[0]?.date ?? null,
  }));

  const active = cycles.filter((c) => c.status === "ACTIVE");
  const planned = cycles.filter((c) => c.status === "PLANNED");
  const past = cycles.filter((c) =>
    ["COMPLETED", "PAUSED", "ABORTED"].includes(c.status)
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <SectionNav current="/cycles" />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Cycles</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Track your compound protocols over time
          </p>
        </div>
        <Button asChild>
          <Link href="/cycles/new">New Cycle</Link>
        </Button>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-2 text-sm">No cycles yet.</p>
          <Link
            href="/cycles/new"
            className="text-sm underline underline-offset-2 hover:text-foreground"
          >
            Start your first cycle
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Active
              </h2>
              <div className="space-y-2">
                {active.map((c) => (
                  <CycleCard key={c.id} cycle={c} />
                ))}
              </div>
            </section>
          )}
          {planned.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Planned
              </h2>
              <div className="space-y-2">
                {planned.map((c) => (
                  <CycleCard key={c.id} cycle={c} />
                ))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Past
              </h2>
              <div className="space-y-2">
                {past.map((c) => (
                  <CycleCard key={c.id} cycle={c} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
