import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { StackGallery } from "@/components/stack/StackGallery";
import type { StackSummary } from "@/components/stack/types";

export const metadata: Metadata = {
  title: "Stacks — CompoundAtlas",
  description: "Community-built compound protocols, evidence-scored and forkable.",
};

export default async function StacksPage() {
  const raw = await db.stack.findMany({
    where: { isPublic: true },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      creator: { select: { name: true, image: true } },
      compounds: {
        include: {
          compound: { select: { name: true, slug: true, category: true } },
        },
        take: 6,
      },
      _count: { select: { cycles: true, forks: true } },
    },
  });

  // Serialize Date objects for client component
  const stacks: StackSummary[] = JSON.parse(JSON.stringify(raw));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stacks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Community-built compound protocols
          </p>
        </div>
        <Button asChild>
          <Link href="/stacks/new">Build Stack</Link>
        </Button>
      </div>

      {stacks.length === 0 ? (
        <div className="py-24 text-center text-muted-foreground">
          <p className="text-sm">No public stacks yet.</p>
          <Link
            href="/stacks/new"
            className="text-sm underline underline-offset-2 hover:text-foreground mt-2 block"
          >
            Build the first one
          </Link>
        </div>
      ) : (
        <StackGallery stacks={stacks} />
      )}
    </div>
  );
}
