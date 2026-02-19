import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  ChevronRight,
  Timer,
  FlaskConical,
  Lock,
  Globe,
  GitFork,
} from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { GoalBadge } from "@/components/stack/GoalBadge";
import { InteractionWarnings } from "@/components/stack/InteractionWarnings";
import { StackActions } from "@/components/stack/StackActions";
import type { StackInteraction } from "@/components/stack/types";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stack = await db.stack.findUnique({
    where: { slug: params.slug },
    select: {
      name: true,
      description: true,
      compounds: { select: { id: true } },
    },
  });
  if (!stack) return { title: "Not Found" };

  const desc =
    stack.description?.slice(0, 160) ??
    `${stack.compounds.length} compound stack on CompoundAtlas`;

  return {
    title: `${stack.name} — CompoundAtlas`,
    description: desc,
    openGraph: {
      title: stack.name,
      description: desc,
      type: "website",
      siteName: "CompoundAtlas",
    },
    twitter: {
      card: "summary",
      title: stack.name,
      description: desc,
    },
  };
}

export default async function StackDetailPage({ params }: Props) {
  const [stack, session] = await Promise.all([
    db.stack.findUnique({
      where: { slug: params.slug },
      include: {
        creator: { select: { id: true, name: true, image: true } },
        forkedFrom: { select: { name: true, slug: true } },
        compounds: {
          include: {
            compound: {
              select: {
                id: true,
                slug: true,
                name: true,
                category: true,
                legalStatus: true,
                evidenceScore: true,
                doseUnit: true,
              },
            },
          },
          orderBy: { startWeek: "asc" },
        },
        _count: { select: { cycles: true, forks: true } },
      },
    }),
    auth(),
  ]);

  if (!stack) notFound();

  const userId = session?.user?.id;

  // Check if user has upvoted
  const userHasUpvoted = userId
    ? !!(await db.stackUpvote.findUnique({
        where: { userId_stackId: { userId, stackId: stack.id } },
      }))
    : false;

  // Fetch interactions between compounds in this stack
  const compoundIds = stack.compounds.map((sc) => sc.compoundId);
  const rawInteractions =
    compoundIds.length >= 2
      ? await db.compoundInteraction.findMany({
          where: {
            sourceCompoundId: { in: compoundIds },
            targetCompoundId: { in: compoundIds },
          },
          include: {
            source: { select: { name: true, slug: true } },
            target: { select: { name: true, slug: true } },
          },
        })
      : [];

  const interactions: StackInteraction[] = rawInteractions;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/stacks" className="hover:text-foreground transition-colors">
          Stacks
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{stack.name}</span>
      </nav>

      {/* Forked from */}
      {stack.forkedFrom && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <GitFork className="h-3.5 w-3.5" />
          Forked from{" "}
          <Link
            href={`/stacks/${stack.forkedFrom.slug}`}
            className="underline hover:text-foreground transition-colors"
          >
            {stack.forkedFrom.name}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {stack.name}
            </h1>
            <EvidenceScoreBadge score={stack.evidenceScore} size="lg" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GoalBadge goal={stack.goal} size="md" />
            {stack.isPublic ? (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Globe className="h-3 w-3" />
                Public
              </span>
            ) : (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Lock className="h-3 w-3" />
                Private
              </span>
            )}
          </div>
        </div>

        <StackActions
          stackId={stack.id}
          stackSlug={stack.slug}
          upvoteCount={stack.upvotes}
          userHasUpvoted={userHasUpvoted}
          isLoggedIn={!!userId}
        />
      </div>

      {/* Description */}
      {stack.description && (
        <p className="text-muted-foreground text-sm leading-relaxed mb-6 whitespace-pre-line">
          {stack.description}
        </p>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
        <span className="flex items-center gap-1.5">
          <FlaskConical className="h-4 w-4" />
          {stack.compounds.length} compound
          {stack.compounds.length !== 1 ? "s" : ""}
        </span>
        {stack.durationWeeks && (
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4" />
            {stack.durationWeeks} weeks
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <GitFork className="h-4 w-4" />
          {stack._count.forks} fork{stack._count.forks !== 1 ? "s" : ""}
        </span>
        <span>
          by{" "}
          <Link
            href={`/users/${stack.creator.id}`}
            className="hover:underline hover:text-foreground transition-colors"
          >
            {stack.creator.name ?? "anonymous"}
          </Link>
        </span>
      </div>

      {/* Compound table */}
      {stack.compounds.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Compounds</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8">#</TableHead>
                <TableHead>Compound</TableHead>
                <TableHead className="hidden sm:table-cell">Category</TableHead>
                <TableHead>Dose</TableHead>
                <TableHead className="hidden md:table-cell">Frequency</TableHead>
                <TableHead className="hidden md:table-cell">Weeks</TableHead>
                <TableHead className="hidden sm:table-cell">Evidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stack.compounds.map((sc, i) => (
                <TableRow key={sc.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/compounds/${sc.compound.slug}`}
                      className="font-medium text-sm hover:underline"
                    >
                      {sc.compound.name}
                    </Link>
                    {sc.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {sc.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CategoryBadge category={sc.compound.category} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {sc.dose != null && sc.unit ? (
                      <>
                        {sc.dose} {sc.unit}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground capitalize">
                    {sc.frequency ?? "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground tabular-nums">
                    {sc.startWeek != null && sc.endWeek != null ? (
                      <>
                        {sc.startWeek}–{sc.endWeek}
                      </>
                    ) : sc.startWeek != null ? (
                      <>from {sc.startWeek}</>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <EvidenceScoreBadge score={sc.compound.evidenceScore} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      {/* Interactions */}
      {interactions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">
            Interactions
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {interactions.length} found
            </span>
          </h2>
          <InteractionWarnings interactions={interactions} />
        </section>
      )}

      <Separator className="mb-6" />

      {/* Meta */}
      <p className="text-xs text-muted-foreground">
        Created by{" "}
        <Link
          href={`/users/${stack.creator.id}`}
          className="hover:underline"
        >
          {stack.creator.name ?? "anonymous"}
        </Link>{" "}
        · {stack._count.cycles} cycle{stack._count.cycles !== 1 ? "s" : ""} run
      </p>
    </div>
  );
}
