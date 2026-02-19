import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StackCard } from "@/components/stack/StackCard";
import type { StackSummary } from "@/components/stack/types";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await db.user.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { name: true },
  });
  if (!user) return { title: "Not Found" };
  return { title: `${user.name ?? "User"} — CompoundAtlas` };
}

export default async function UserProfilePage({ params }: Props) {
  const user = await db.user.findUnique({
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

  if (!user) notFound();

  const totalUpvotes = user.stacks.reduce((sum, s) => sum + s.upvotes, 0);
  const compoundSlugs = new Set(
    user.stacks.flatMap((s) => s.compounds.map((c) => c.compound.slug))
  );

  const stacks: StackSummary[] = JSON.parse(JSON.stringify(user.stacks));

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
              <strong className="text-foreground">{user.stacks.length}</strong>{" "}
              public stack{user.stacks.length !== 1 ? "s" : ""}
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
