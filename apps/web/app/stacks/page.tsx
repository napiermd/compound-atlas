import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCategory } from "@/lib/utils";

export const metadata: Metadata = { title: "Stacks" };

export default async function StacksPage() {
  const stacks = await db.stack.findMany({
    where: { isPublic: true },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      creator: { select: { name: true } },
      compounds: {
        include: { compound: { select: { name: true } } },
        take: 6,
      },
      _count: { select: { cycles: true } },
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stacks</h1>
          <p className="text-muted-foreground mt-1">
            Community-built compound protocols
          </p>
        </div>
        <Button asChild>
          <Link href="/stacks/new">Build Stack</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stacks.map((stack) => (
          <Link key={stack.id} href={`/stacks/${stack.slug}`}>
            <Card className="hover:bg-accent transition-colors h-full cursor-pointer">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <CardTitle className="text-base leading-tight">
                    {stack.name}
                  </CardTitle>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {stack.upvotes} ↑
                  </span>
                </div>
                <Badge variant="secondary" className="w-fit text-xs">
                  {formatCategory(stack.goal)}
                </Badge>
                {stack.description && (
                  <CardDescription className="text-xs line-clamp-2">
                    {stack.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1 mb-2">
                  {stack.compounds.slice(0, 5).map((sc) => (
                    <Badge key={sc.id} variant="outline" className="text-xs">
                      {sc.compound.name}
                    </Badge>
                  ))}
                  {stack.compounds.length > 5 && (
                    <Badge variant="outline" className="text-xs">
                      +{stack.compounds.length - 5}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  by {stack.creator.name ?? "anonymous"} ·{" "}
                  {stack._count.cycles} cycle
                  {stack._count.cycles !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}

        {stacks.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            No public stacks yet.{" "}
            <Link href="/stacks/new" className="underline">
              Be the first.
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
