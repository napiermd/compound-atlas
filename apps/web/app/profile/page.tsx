import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProfileDashboard } from "./ProfileDashboard";

export const metadata: Metadata = {
  title: "Health Profile — CompoundAtlas",
  description: "Your health profile and personalized stack recommendations.",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Health Profile</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Your phenotype data powers personalized recommendations.
        </p>
      </div>
      <ProfileDashboard />
    </div>
  );
}
