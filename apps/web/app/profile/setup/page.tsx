import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileSetupWizard } from "./ProfileSetupWizard";

export const metadata: Metadata = {
  title: "Profile Setup — CompoundAtlas",
  description: "Set up your health profile for personalized stack recommendations.",
};

export default async function ProfileSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const existing = await db.healthProfile.findUnique({
    where: { userId: session.user.id },
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Health Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tell us about yourself to get personalized stack recommendations.
          All fields are optional — share as much or as little as you want.
        </p>
      </div>
      <ProfileSetupWizard existing={existing} />
    </div>
  );
}
