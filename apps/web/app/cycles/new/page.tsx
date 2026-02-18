import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NewCycleForm } from "@/components/cycle/NewCycleForm";

export const metadata: Metadata = {
  title: "New Cycle — CompoundAtlas",
};

export default async function NewCyclePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const stacks = await db.stack.findMany({
    where: { creatorId: session.user.id },
    select: { id: true, name: true, slug: true, durationWeeks: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">New Cycle</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Start tracking a compound protocol.
        </p>
      </div>
      <NewCycleForm stacks={stacks} />
    </div>
  );
}
