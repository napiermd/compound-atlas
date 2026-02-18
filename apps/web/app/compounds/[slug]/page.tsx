import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCategory } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const compound = await db.compound.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true },
  });
  return {
    title: compound?.name ?? "Compound",
    description: compound?.description?.slice(0, 160) ?? undefined,
  };
}

export default async function CompoundDetailPage({ params }: Props) {
  const compound = await db.compound.findUnique({
    where: { slug: params.slug },
    include: {
      sideEffects: { orderBy: { severity: "asc" } },
      mechanisms: true,
      interactions: {
        include: {
          target: { select: { name: true, slug: true } },
        },
      },
      studies: {
        include: { study: true },
        take: 10,
      },
      outcomes: {
        take: 20,
        orderBy: { metric: "asc" },
      },
    },
  });

  if (!compound) notFound();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold tracking-tight">{compound.name}</h1>
          {compound.evidenceScore != null && (
            <div className="text-right shrink-0">
              <div className="text-3xl font-bold tabular-nums">
                {compound.evidenceScore.toFixed(0)}
              </div>
              <div className="text-xs text-muted-foreground">
                evidence score
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 flex-wrap">
          <Badge>{formatCategory(compound.category)}</Badge>
          <Badge variant="outline">{formatCategory(compound.legalStatus)}</Badge>
          {compound.aliases.slice(0, 4).map((a) => (
            <Badge key={a} variant="secondary" className="text-xs">
              {a}
            </Badge>
          ))}
        </div>
      </div>

      {compound.description && (
        <p className="text-muted-foreground mb-8 leading-relaxed whitespace-pre-line">
          {compound.description}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dosing</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {compound.doseTypical != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Typical</span>
                <span className="font-medium">
                  {compound.doseTypical} {compound.doseUnit}
                </span>
              </div>
            )}
            {compound.doseMin != null && compound.doseMax != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Range</span>
                <span>
                  {compound.doseMin}–{compound.doseMax} {compound.doseUnit}
                </span>
              </div>
            )}
            {compound.doseFrequency && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span>{compound.doseFrequency}</span>
              </div>
            )}
            {!compound.doseTypical && !compound.doseMin && (
              <p className="text-muted-foreground text-xs">No dosing data yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pharmacology</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            {compound.halfLife && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Half-life</span>
                <span className="text-right">{compound.halfLife}</span>
              </div>
            )}
            {compound.onset && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Onset</span>
                <span className="text-right">{compound.onset}</span>
              </div>
            )}
            {compound.routeOfAdmin.length > 0 && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Routes</span>
                <span>{compound.routeOfAdmin.join(", ")}</span>
              </div>
            )}
            {compound.mechanismShort && (
              <div>
                <span className="text-muted-foreground block mb-1">
                  Mechanism
                </span>
                <p className="text-xs">{compound.mechanismShort}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {compound.mechanisms.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Mechanisms of Action</h2>
          <div className="space-y-2">
            {compound.mechanisms.map((m) => (
              <div key={m.id} className="rounded-md bg-muted px-4 py-3 text-sm">
                <p className="font-medium capitalize">
                  {m.pathway.replace(/_/g, " ")}
                </p>
                {m.description && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {m.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {compound.sideEffects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Side Effects</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {compound.sideEffects.map((se) => (
              <div
                key={se.id}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className="capitalize">{se.name.replace(/_/g, " ")}</span>
                <div className="flex gap-1">
                  {se.severity && (
                    <Badge variant="outline" className="text-xs">
                      {se.severity}
                    </Badge>
                  )}
                  {se.frequency && (
                    <Badge variant="secondary" className="text-xs">
                      {se.frequency}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {compound.interactions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">Interactions</h2>
          <div className="space-y-2">
            {compound.interactions.map((i) => (
              <div
                key={i.id}
                className="flex items-start gap-3 rounded-md border px-3 py-2 text-sm"
              >
                <Badge
                  variant={
                    i.interactionType === "synergistic"
                      ? "default"
                      : "destructive"
                  }
                  className="text-xs shrink-0 mt-0.5"
                >
                  {i.interactionType}
                </Badge>
                <div>
                  <span className="font-medium">{i.target.name}</span>
                  {i.description && (
                    <p className="text-muted-foreground text-xs mt-0.5">
                      {i.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {compound.studies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3">
            Studies{" "}
            <span className="text-muted-foreground font-normal text-sm">
              ({compound.studyCount} total)
            </span>
          </h2>
          <div className="space-y-3">
            {compound.studies.map(({ study }) => (
              <Card key={study.id}>
                <CardContent className="pt-4 text-sm">
                  <p className="font-medium leading-snug">{study.title}</p>
                  <div className="flex gap-2 mt-2 flex-wrap items-center">
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
                        n={study.sampleSize}
                      </span>
                    )}
                    {study.fullTextUrl && (
                      <a
                        href={study.fullTextUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-muted-foreground"
                      >
                        Full text
                      </a>
                    )}
                  </div>
                  {study.tldr && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      {study.tldr}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
