import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StackBuilder } from "@/components/stack/StackBuilder";
import type { CompoundOption } from "@/components/stack/types";

export const metadata: Metadata = {
  title: "Build a Stack — CompoundAtlas",
};

export default async function NewStackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const compounds: CompoundOption[] = await db.compound.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      evidenceScore: true,
      doseUnit: true,
    },
    orderBy: [{ studyCount: "desc" }, { name: "asc" }],
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Build a Stack</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Add compounds, configure doses, check interactions, save your
          protocol.
        </p>
      </div>

      <StackBuilder compounds={compounds} />
    </div>
  );
}
