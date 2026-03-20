import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { SectionNav } from "@/components/layout/SectionNav";
import { PersonalizedStacks } from "./PersonalizedStacks";
import { Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Personalized Stacks — CompoundAtlas",
  description:
    "Stack recommendations personalized to your health profile, goals, and lab results.",
};

export default async function PersonalizedStacksPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionNav current="/stacks" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Your Recommendations
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Stacks ranked by fit to your phenotype, goals, and lab results.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/profile/setup" className="gap-1.5">
            <Settings className="h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      </div>

      <PersonalizedStacks />
    </div>
  );
}
