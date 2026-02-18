import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCategory } from "@/lib/utils";

export const metadata: Metadata = { title: "Compounds" };

export default async function CompoundsPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string };
}) {
  const compounds = await db.compound.findMany({
    where: {
      ...(searchParams.category && {
        category: searchParams.category as never,
      }),
      ...(searchParams.q && {
        OR: [
          { name: { contains: searchParams.q, mode: "insensitive" } },
          { description: { contains: searchParams.q, mode: "insensitive" } },
        ],
      }),
    },
    orderBy: [{ evidenceScore: "desc" }, { name: "asc" }],
    take: 100,
  });

  const categories = await db.compound.groupBy({
    by: ["category"],
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Compounds</h1>
        <p className="text-muted-foreground mt-1">
          {compounds.length} compound{compounds.length !== 1 ? "s" : ""} indexed
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <Link href="/compounds">
          <Badge
            variant={!searchParams.category ? "default" : "outline"}
            className="cursor-pointer"
          >
            All
          </Badge>
        </Link>
        {categories.map(({ category, _count }) => (
          <Link
            key={category}
            href={`/compounds?category=${category}`}
          >
            <Badge
              variant={
                searchParams.category === category ? "default" : "outline"
              }
              className="cursor-pointer"
            >
              {formatCategory(category)} ({_count._all})
            </Badge>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {compounds.map((c) => (
          <Link key={c.id} href={`/compounds/${c.slug}`}>
            <Card className="hover:bg-accent transition-colors h-full cursor-pointer">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">
                    {c.name}
                  </CardTitle>
                  {c.evidenceScore != null && (
                    <span className="text-xs font-mono text-muted-foreground shrink-0 tabular-nums">
                      {c.evidenceScore.toFixed(0)}
                    </span>
                  )}
                </div>
                <div className="flex gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {formatCategory(c.category)}
                  </Badge>
                  {c.legalStatus !== "LEGAL" && (
                    <Badge variant="outline" className="text-xs">
                      {formatCategory(c.legalStatus)}
                    </Badge>
                  )}
                </div>
                {c.mechanismShort && (
                  <CardDescription className="text-xs line-clamp-2">
                    {c.mechanismShort}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          </Link>
        ))}

        {compounds.length === 0 && (
          <div className="col-span-full text-center py-16 text-muted-foreground">
            No compounds found.{" "}
            <Link href="/compounds" className="underline">
              Clear filters
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
