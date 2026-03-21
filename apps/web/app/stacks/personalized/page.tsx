import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PersonalizedStacks } from "./PersonalizedStacks";

export const metadata: Metadata = {
  title: "Your Personalized Stacks — CompoundAtlas",
  description: "Stack recommendations tailored to your health profile and goals.",
};

export default async function PersonalizedStacksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const profile = await db.healthProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!profile?.completedAt) {
    redirect("/profile/setup");
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Recommended For You
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Stacks ranked by your health profile, goals, and lab results.
        </p>
      </div>
      <PersonalizedStacks />
    </div>
  );
}
