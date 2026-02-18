import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Research" };

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: { type?: string; level?: string };
}) {
  const studies = await db.study.findMany({
    where: {
      ...(searchParams.type && { studyType: searchParams.type as never }),
      ...(searchParams.level && {
        evidenceLevel: searchParams.level as never,
      }),
    },
    orderBy: [{ year: "desc" }],
    take: 50,
    include: {
      compounds: {
        include: { compound: { select: { name: true, slug: true } } },
        take: 4,
      },
    },
  });

  const total = await db.study.count();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Research</h1>
        <p className="text-muted-foreground mt-1">
          {total} studies indexed from PubMed and Semantic Scholar
        </p>
      </div>

      {studies.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-2">No studies indexed yet.</p>
          <p className="text-sm text-muted-foreground font-mono">
            cd packages/research-ingestion && python -m src.ingest
            --incremental
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {studies.map((study) => (
            <Card key={study.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium leading-snug">
                  {study.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="flex gap-2 flex-wrap mb-2 items-center">
                  <Badge variant="outline" className="text-xs">
                    {study.studyType.replace(/_/g, " ")}
                  </Badge>
                  {study.evidenceLevel && (
                    <Badge className="text-xs">
                      Level {study.evidenceLevel}
                    </Badge>
                  )}
                  {study.year && (
                    <span className="text-muted-foreground text-xs">
                      {study.year}
                    </span>
                  )}
                  {study.sampleSize && (
                    <span className="text-muted-foreground text-xs">
                      n={study.sampleSize.toLocaleString()}
                    </span>
                  )}
                  {study.journal && (
                    <span className="text-muted-foreground text-xs italic">
                      {study.journal}
                    </span>
                  )}
                  {study.isOpenAccess && study.fullTextUrl && (
                    <a
                      href={study.fullTextUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline text-muted-foreground"
                    >
                      Open access
                    </a>
                  )}
                </div>

                {study.compounds.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {study.compounds.map((cs) => (
                      <Badge
                        key={cs.id}
                        variant="secondary"
                        className="text-xs"
                      >
                        {cs.compound.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {study.tldr && (
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {study.tldr}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
