import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ProfileSetupWizard } from "./ProfileSetupWizard";

export const metadata: Metadata = {
  title: "Profile Setup — CompoundAtlas",
  description: "Set up your health profile for personalized stack recommendations.",
};

export default async function ProfileSetupPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Profile Setup</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tell us about yourself so we can recommend the best stacks for you.
        </p>
      </div>
      <ProfileSetupWizard />
    </div>
  );
}
