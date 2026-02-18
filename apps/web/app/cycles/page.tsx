import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { format } from "date-fns";

export const metadata: Metadata = { title: "My Cycles" };

const statusVariant = {
  PLANNED: "outline",
  ACTIVE: "default",
  COMPLETED: "secondary",
  PAUSED: "outline",
  ABORTED: "destructive",
} as const;

export default async function CyclesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const cycles = await db.cycle.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      stack: { select: { name: true, slug: true } },
      _count: { select: { entries: true } },
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Cycles</h1>
          <p className="text-muted-foreground mt-1">
            Track your compound protocols over time
          </p>
        </div>
        <Button disabled title="Coming soon">
          New Cycle
        </Button>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-4">No cycles yet.</p>
          <p className="text-sm text-muted-foreground">
            Pick a stack from the{" "}
            <Link href="/stacks" className="underline">
              Stacks gallery
            </Link>{" "}
            to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <Card key={cycle.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{cycle.name}</CardTitle>
                  <Badge variant={statusVariant[cycle.status]}>
                    {cycle.status.toLowerCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {cycle.stack && (
                    <span>
                      Stack:{" "}
                      <Link
                        href={`/stacks/${cycle.stack.slug}`}
                        className="text-foreground hover:underline"
                      >
                        {cycle.stack.name}
                      </Link>
                    </span>
                  )}
                  {cycle.startDate && (
                    <span>
                      Started: {format(cycle.startDate, "MMM d, yyyy")}
                    </span>
                  )}
                  {cycle.endDate && (
                    <span>
                      Ended: {format(cycle.endDate, "MMM d, yyyy")}
                    </span>
                  )}
                  <span>
                    {cycle._count.entries} entr
                    {cycle._count.entries !== 1 ? "ies" : "y"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
