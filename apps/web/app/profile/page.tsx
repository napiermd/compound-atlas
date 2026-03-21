import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileDashboard } from "./ProfileDashboard";

export const metadata: Metadata = {
  title: "Your Profile — CompoundAtlas",
  description: "View and manage your health profile.",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [profile, labCount] = await Promise.all([
    db.healthProfile.findUnique({
      where: { userId: session.user.id },
    }),
    db.labResult.count({
      where: { userId: session.user.id },
    }),
  ]);

  if (!profile?.completedAt) {
    redirect("/profile/setup");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <ProfileDashboard profile={profile} labCount={labCount} />
    </div>
  );
}
