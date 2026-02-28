import Link from "next/link";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { StackGallery } from "@/components/stack/StackGallery";
import { BulkCutComparison } from "@/components/stack/BulkCutComparison";
import { SectionNav } from "@/components/layout/SectionNav";
import type { StackSummary } from "@/components/stack/types";
import { normalizeArray } from "@/lib/normalize";

export const metadata: Metadata = {
  title: "Stacks — CompoundAtlas",
  description: "Community-built compound protocols, evidence-scored and forkable.",
};

export default async function StacksPage() {
  const session = await auth();
  const aiHref = session?.user?.id ? "/stacks/ai" : "/login";

  type RawStack = {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    goal: StackSummary["goal"];
    durationWeeks: number | null;
    isPublic: boolean;
    evidenceScore: number | null;
    category?: StackSummary["category"];
    folder?: string | null;
    tags?: string[];
    riskFlags?: string[];
    orderIndex?: number;
    upvotes: number;
    forkCount: number;
    forkedFromId: string | null;
    createdAt: string | Date;
    updatedAt?: string | Date;
    creatorId?: string;
    creator: { name: string | null; image: string | null };
    compounds: Array<{
      id: string;
      compound: {
        name: string;
        slug: string;
        category: StackSummary["compounds"][number]["compound"]["category"];
        safetyCaveats?: string[];
        legalCaveats?: string[];
        lastResearchSync?: string | Date | null;
        lastReviewedAt?: string | Date | null;
      };
    }>;
    _count: { cycles: number; forks: number };
    userHasUpvoted?: boolean;
  };

  let raw: RawStack[] = [];
  try {
    raw = (await db.stack.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        creator: { select: { name: true, image: true } },
        compounds: {
          include: {
            compound: {
              select: {
                name: true,
                slug: true,
                category: true,
                safetyCaveats: true,
                legalCaveats: true,
                lastResearchSync: true,
                lastReviewedAt: true,
              },
            },
          },
          take: 6,
        },
        _count: { select: { cycles: true, forks: true } },
      },
    })) as RawStack[];
  } catch {
    // Backward-compatible fallback for environments where Stack.category
    // and related fields are not migrated yet.
    raw = (await db.stack.findMany({
      where: { isPublic: true },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        goal: true,
        durationWeeks: true,
        isPublic: true,
        evidenceScore: true,
        upvotes: true,
        forkCount: true,
        forkedFromId: true,
        createdAt: true,
        updatedAt: true,
        creatorId: true,
        creator: { select: { name: true, image: true } },
        compounds: {
          include: {
            compound: {
              select: {
                name: true,
                slug: true,
                category: true,
                safetyCaveats: true,
                legalCaveats: true,
                lastResearchSync: true,
                lastReviewedAt: true,
              },
            },
          },
          take: 6,
        },
        _count: { select: { cycles: true, forks: true } },
      },
    })) as RawStack[];
  }

  const normalized = raw.map((s) => ({
    ...s,
    category: s.category ?? ("SPECIALTY" as StackSummary["category"]),
    folder: s.folder ?? null,
    tags: normalizeArray<string>(s.tags),
    riskFlags: normalizeArray<string>(s.riskFlags),
    orderIndex: typeof s.orderIndex === "number" ? s.orderIndex : 0,
    updatedAt: (s.updatedAt as string | Date | undefined) ?? s.createdAt,
  }));

  // Serialize Date objects for client component
  const stacks: StackSummary[] = JSON.parse(JSON.stringify(normalized));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <SectionNav current="/stacks" />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stacks</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Community-built compound protocols
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline">
            <Link href={aiHref} className="gap-1.5">
              <Sparkles className="h-4 w-4" />
              {session?.user?.id ? "AI Builder" : "Sign in for AI"}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/stacks/new">Build Stack</Link>
          </Button>
        </div>
      </div>

      {stacks.length > 0 && <BulkCutComparison stacks={stacks} />}

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
        <StackGallery stacks={stacks} currentUserId={session?.user?.id} />
      )}
    </div>
  );
}
