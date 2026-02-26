import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StackCard } from "@/components/stack/StackCard";
import type { StackSummary } from "@/components/stack/types";
import { normalizeArray } from "@/lib/normalize";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  let user: { name: string | null } | null = null;
  try {
    user = await db.user.findUnique({
      where: { id: params.id, deletedAt: null },
      select: { name: true },
    });
  } catch {
    user = await db.user.findUnique({
      where: { id: params.id },
      select: { name: true },
    });
  }

  if (!user) return { title: "Not Found" };
  return { title: `${user.name ?? "User"} — CompoundAtlas` };
}

export default async function UserProfilePage({ params }: Props) {
  let user = null;

  try {
    user = await db.user.findUnique({
      where: { id: params.id, deletedAt: null },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        stacks: {
          where: { isPublic: true },
          orderBy: { upvotes: "desc" },
          take: 50,
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
        },
      },
    });
  } catch {
    // Backward-compatible fallback for DBs without soft-delete/fork counters.
    user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        stacks: {
          where: { isPublic: true },
          orderBy: { upvotes: "desc" },
          take: 50,
          include: {
            creator: { select: { name: true, image: true } },
            compounds: {
              include: {
                compound: { select: { name: true, slug: true, category: true } },
              },
              take: 6,
            },
            _count: { select: { cycles: true } },
          },
        },
      },
    });
  }

  if (!user) notFound();

  const userStacks = normalizeArray<typeof user.stacks[number]>(user.stacks);

  const totalUpvotes = userStacks.reduce((sum, s) => sum + (s.upvotes ?? 0), 0);
  const compoundSlugs = new Set(
    userStacks.flatMap((s) => normalizeArray<typeof s.compounds[number]>(s.compounds).map((c) => c.compound.slug))
  );

  const stacks: StackSummary[] = JSON.parse(JSON.stringify(userStacks));

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Profile header */}
      <div className="flex items-center gap-5 mb-10">
        <Avatar className="h-16 w-16">
          <AvatarImage src={user.image ?? undefined} alt={user.name ?? "User"} />
          <AvatarFallback className="text-xl">
            {user.name?.[0]?.toUpperCase() ?? "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {user.name ?? "Anonymous"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Joined{" "}
            {new Date(user.createdAt).toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">{stacks.length}</strong>{" "}
              public stack{stacks.length !== 1 ? "s" : ""}
            </span>
            <span>
              <strong className="text-foreground">{totalUpvotes}</strong> total
              upvotes
            </span>
            <span>
              <strong className="text-foreground">
                {compoundSlugs.size}
              </strong>{" "}
              compounds used
            </span>
          </div>
        </div>
      </div>

      {/* Stacks */}
      {stacks.length > 0 ? (
        <div>
          <h2 className="text-base font-semibold mb-4">Public Stacks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stacks.map((s) => (
              <StackCard key={s.id} stack={s} />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No public stacks yet.</p>
      )}
    </div>
  );
}
