import type { Metadata } from "next";
import { AiStackBuilder } from "./AiStackBuilder";
import { db } from "@/lib/db";

export const metadata: Metadata = {
  title: "AI Stack Builder — CompoundAtlas",
  description:
    "Describe your goal and let AI suggest an evidence-based compound stack from our database.",
};

export default async function AiStackPage() {
  // Fetch all compounds to pass to the builder for the save mutation
  const compounds = await db.compound.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      evidenceScore: true,
      doseUnit: true,
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Stack Builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Describe your goal and get an evidence-based stack from our compound
          database.
        </p>
      </div>
      <AiStackBuilder compounds={JSON.parse(JSON.stringify(compounds))} />
    </div>
  );
}
