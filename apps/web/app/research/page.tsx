import Link from "next/link";
import type { Metadata } from "next";
import { EvidenceLevel, StudyType } from "@prisma/client";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SectionNav } from "@/components/layout/SectionNav";
import { normalizeArray } from "@/lib/normalize";

export const metadata: Metadata = { title: "Research" };

const STUDY_TYPE_OPTIONS: StudyType[] = [
  "META_ANALYSIS",
  "SYSTEMATIC_REVIEW",
  "RCT",
  "CONTROLLED_TRIAL",
  "COHORT",
  "CASE_CONTROL",
  "CROSS_SECTIONAL",
  "CASE_REPORT",
  "REVIEW",
  "ANIMAL",
  "IN_VITRO",
  "OTHER",
];

const EVIDENCE_LEVEL_OPTIONS: EvidenceLevel[] = ["A", "B", "C", "D"];

function formatStudyType(type: StudyType) {
  return type.replace(/_/g, " ");
}

type StudyListItem = Awaited<ReturnType<typeof db.study.findMany>>[number];

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: { type?: string; level?: string; q?: string };
}) {
  const selectedType =
    searchParams.type && STUDY_TYPE_OPTIONS.includes(searchParams.type as StudyType)
      ? (searchParams.type as StudyType)
      : undefined;

  const selectedLevel =
    searchParams.level &&
    EVIDENCE_LEVEL_OPTIONS.includes(searchParams.level as EvidenceLevel)
      ? (searchParams.level as EvidenceLevel)
      : undefined;

  const query = searchParams.q?.trim() ?? "";

  const baseWhere = {
    ...(selectedType && { studyType: selectedType }),
    ...(query && {
      OR: [
        { title: { contains: query, mode: "insensitive" as const } },
        { journal: { contains: query, mode: "insensitive" as const } },
        {
          compounds: {
            some: {
              compound: {
                OR: [
                  { name: { contains: query, mode: "insensitive" as const } },
                  { aliases: { has: query } },
                ],
              },
            },
          },
        },
      ],
    }),
  };

  let studies: unknown[] = [];
  let total = 0;
  let filteredCount = 0;

  try {
    const where = {
      ...baseWhere,
      ...(selectedLevel && { evidenceLevel: selectedLevel }),
    };

    [studies, total, filteredCount] = await Promise.all([
      db.study.findMany({
        where,
        orderBy: [{ publicationDate: "desc" }, { year: "desc" }],
        take: 60,
        include: {
          compounds: {
            include: { compound: { select: { name: true, slug: true } } },
            take: 5,
          },
        },
      }),
      db.study.count(),
      db.study.count({ where }),
    ]);
  } catch {
    // Backward-compatible fallback for DBs without newer evidence-level shape.
    [studies, total, filteredCount] = await Promise.all([
      db.study.findMany({
        where: baseWhere,
        orderBy: [{ publicationDate: "desc" }, { year: "desc" }],
        take: 60,
        include: {
          compounds: {
            include: { compound: { select: { name: true, slug: true } } },
            take: 5,
          },
        },
      }),
      db.study.count().catch(() => 0),
      db.study.count({ where: baseWhere }).catch(() => 0),
    ]);
  }

  const normalizedStudies = normalizeArray<StudyListItem>(studies);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <SectionNav current="/research" />

      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Research</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {total.toLocaleString()} studies indexed from PubMed and Semantic Scholar
        </p>
      </div>

      <form className="mb-6 rounded-lg border bg-card p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Search title, journal, or compound"
          className="md:col-span-2 h-10 rounded-md border bg-background px-3 text-sm"
        />

        <select
          name="type"
          defaultValue={selectedType ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All study types</option>
          {STUDY_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {formatStudyType(type)}
            </option>
          ))}
        </select>

        <select
          name="level"
          defaultValue={selectedLevel ?? ""}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">All evidence levels</option>
          {EVIDENCE_LEVEL_OPTIONS.map((level) => (
            <option key={level} value={level}>
              Level {level}
            </option>
          ))}
        </select>

        <div className="md:col-span-4 flex items-center gap-3">
          <button
            type="submit"
            className="h-8 rounded-md bg-primary text-primary-foreground px-3 text-sm"
          >
            Apply filters
          </button>
          <Link
            href="/research"
            className="h-8 inline-flex items-center rounded-md border px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            Clear
          </Link>
          <p className="text-xs text-muted-foreground">
            Showing {Math.min(filteredCount, normalizedStudies.length).toLocaleString()} of {filteredCount.toLocaleString()} matching studies
          </p>
        </div>
      </form>

      {normalizedStudies.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <p className="text-muted-foreground mb-2">No studies match these filters.</p>
          <Link href="/research" className="text-sm underline underline-offset-2 hover:text-foreground">
            Reset filters
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {normalizedStudies.map((study) => (
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
                    <Badge className="text-xs">Level {study.evidenceLevel}</Badge>
                  )}
                  {study.year && (
                    <span className="text-muted-foreground text-xs">{study.year}</span>
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
                  {study.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline text-muted-foreground"
                    >
                      PubMed
                    </a>
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

                {study.compounds.length > 0 && (
                  <div className="flex gap-1 flex-wrap mb-2">
                    {study.compounds.map((cs) => (
                      <Link key={cs.id} href={`/compounds/${cs.compound.slug}`}>
                        <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                          {cs.compound.name}
                        </Badge>
                      </Link>
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
