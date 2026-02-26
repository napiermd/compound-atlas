import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AiStackBuilder } from "./AiStackBuilder";

export const metadata: Metadata = {
  title: "AI Stack Builder — CompoundAtlas",
  description:
    "Describe your goal and let AI suggest an evidence-based compound stack from our database.",
};

export default async function AiStackPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  let profile = null;
  try {
    profile = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        sex: true,
        weightLbs: true,
        heightFt: true,
        heightIn: true,
      },
    });
  } catch {
    // Backward-compatible fallback for DBs without profile biometrics columns.
    profile = null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">AI Stack Builder</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Describe your goal and get an evidence-based stack from our compound
          database.
        </p>
      </div>
      <AiStackBuilder profile={profile} />
    </div>
  );
}
