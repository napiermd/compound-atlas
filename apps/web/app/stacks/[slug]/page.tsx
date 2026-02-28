import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNowStrict } from "date-fns";
import type { CompoundCategory, StackGoal } from "@prisma/client";
import {
  ChevronRight,
  Timer,
  FlaskConical,
  Lock,
  Globe,
  GitFork,
  Info,
  Bot,
  TrendingUp,
  Clock3,
  AlertTriangle,
} from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildBiometrics, scaleDose } from "@/lib/dose-utils";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { GoalBadge } from "@/components/stack/GoalBadge";
import { InteractionWarnings } from "@/components/stack/InteractionWarnings";
import { StackActions } from "@/components/stack/StackActions";
import type { StackInteraction } from "@/components/stack/types";
import { normalizeArray } from "@/lib/normalize";

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
  const session = await auth();

  let stack = null;
  try {
    stack = await db.stack.findUnique({
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
    });
  } catch {
    // Backward-compatible fallback when stack fork counters/relations are not available yet.
    stack = await db.stack.findUnique({
      where: { slug: params.slug },
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
        riskFlags: true,
        createdAt: true,
        creator: { select: { id: true, name: true, image: true } },
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
        _count: { select: { cycles: true } },
      },
    });
  }

  if (!stack) notFound();

  const base = stack as {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    goal: StackGoal;
    durationWeeks: number | null;
    isPublic: boolean;
    evidenceScore: number | null;
    upvotes?: number;
    riskFlags?: string[];
    createdAt: string | Date;
    creator: { id: string; name: string | null; image: string | null };
    compounds: Array<{
      id: string;
      compoundId: string;
      notes: string | null;
      dose: number | null;
      unit: string | null;
      frequency: string | null;
      startWeek: number | null;
      endWeek: number | null;
      compound: {
        id: string;
        slug: string;
        name: string;
        category: CompoundCategory;
        legalStatus: string;
        evidenceScore: number | null;
        doseUnit: string | null;
      };
    }>;
    forkedFrom?: { name: string; slug: string } | null;
    _count: { cycles: number; forks?: number };
  };

  const safeStack = {
    ...base,
    forkedFrom: base.forkedFrom ?? null,
    upvotes: typeof base.upvotes === "number" ? base.upvotes : 0,
    riskFlags: normalizeArray<string>(base.riskFlags),
    _count: {
      cycles: base._count?.cycles ?? 0,
      forks: typeof base._count?.forks === "number" ? base._count.forks : 0,
    },
  };

  // Parse variant from stack name suffix (e.g. " — Core", " — Low-Side")
  const variantMatch = safeStack.name.match(/\s—\s(.+)$/);
  const variant = variantMatch?.[1] ?? null;
  const VARIANT_EXPLAINERS: Record<string, string> = {
    Core: "Evidence-prioritized. Includes all compound categories allowed for this experience level.",
    "Low-Side":
      "Conservative hormone protocol. Allows prescription compounds but excludes gray market and SARMs.",
    Conservative:
      "OTC only. Budget-friendly supplements with minimal side effects.",
  };
  const variantExplainer = variant ? VARIANT_EXPLAINERS[variant] ?? null : null;
  const isAutoGenerated = safeStack.creator?.name === "CompoundAtlas Bot";

  const userId = session?.user?.id;

  // Optional biometrics for personalized doses
  let biometrics = null;
  if (userId) {
    const u = await db.user.findUnique({
      where: { id: userId },
      select: { sex: true, weightLbs: true, heightFt: true, heightIn: true },
    });
    if (u?.sex && u.weightLbs && u.heightFt != null && u.heightIn != null) {
      biometrics = buildBiometrics(u.sex, u.weightLbs, u.heightFt, u.heightIn);
    }
  }

  // Check if user has upvoted
  const userHasUpvoted = userId
    ? !!(await db.stackUpvote.findUnique({
        where: { userId_stackId: { userId, stackId: safeStack.id } },
      }))
    : false;

  // Fetch interactions between compounds in this stack
  const compoundIds = safeStack.compounds.map((sc) => sc.compoundId);
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

  const interactions = normalizeArray<StackInteraction>(rawInteractions);

  const experience = safeStack.name.startsWith("Beginner")
    ? "Beginner"
    : safeStack.name.startsWith("Intermediate")
      ? "Intermediate"
      : safeStack.name.startsWith("Advanced")
        ? "Advanced"
        : null;

  const stackFreshness = formatDistanceToNowStrict(new Date(safeStack.createdAt), {
    addSuffix: true,
  });

  const trendScore =
    (safeStack.upvotes ?? 0) * 1 +
    (safeStack._count?.forks ?? 0) * 2 +
    (safeStack._count?.cycles ?? 0) * 3;

  const comparisonGoal: StackGoal | null =
    safeStack.goal === "BULK" ? "CUT" : safeStack.goal === "CUT" ? "BULK" : null;

  const comparisonCandidates = comparisonGoal
    ? await db.stack.findMany({
        where: {
          isPublic: true,
          goal: comparisonGoal,
          ...(experience ? { name: { startsWith: experience } } : {}),
        },
        orderBy: [{ evidenceScore: "desc" }, { upvotes: "desc" }],
        take: 3,
        select: {
          slug: true,
          name: true,
          description: true,
          evidenceScore: true,
          upvotes: true,
          _count: { select: { forks: true, cycles: true } },
        },
      })
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/stacks" className="hover:text-foreground transition-colors">
          Stacks
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{safeStack.name}</span>
      </nav>

      {/* Forked from */}
      {safeStack.forkedFrom && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
          <GitFork className="h-3.5 w-3.5" />
          Forked from{" "}
          <Link
            href={`/stacks/${safeStack.forkedFrom.slug}`}
            className="underline hover:text-foreground transition-colors"
          >
            {safeStack.forkedFrom.name}
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap mb-2">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {safeStack.name}
            </h1>
            <div className="flex flex-col items-start gap-0.5">
              <EvidenceScoreBadge score={safeStack.evidenceScore} size="lg" />
              <span className="text-[10px] text-muted-foreground leading-tight">
                mean of {safeStack.compounds.length} compound score{safeStack.compounds.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <GoalBadge goal={safeStack.goal} size="md" />
            {safeStack.isPublic ? (
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
          stackId={safeStack.id}
          stackSlug={safeStack.slug}
          upvoteCount={safeStack.upvotes ?? 0}
          userHasUpvoted={userHasUpvoted}
          isLoggedIn={!!userId}
        />
      </div>

      {/* Description */}
      {safeStack.description && (
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 whitespace-pre-line">
          {safeStack.description}
        </p>
      )}

      {/* Metadata framing */}
      <section className="mb-6 rounded-lg border bg-muted/20 p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Info className="h-4 w-4 text-muted-foreground" />
          Quick read before you run this stack
        </div>
        <div className="grid gap-2 sm:grid-cols-3 text-sm">
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Confidence</p>
            <div className="mt-1">
              <EvidenceScoreBadge score={safeStack.evidenceScore} />
            </div>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Trend</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              {trendScore} momentum
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {(safeStack.upvotes ?? 0)} upvotes · {safeStack._count.forks ?? 0} forks · {safeStack._count.cycles} cycles
            </p>
          </div>
          <div className="rounded-md border bg-background px-3 py-2">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Freshness</p>
            <p className="mt-1 inline-flex items-center gap-1.5 font-medium">
              <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
              Created {stackFreshness}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">For: {safeStack.goal.toLowerCase().replace("_", " ")} outcomes</Badge>
          {experience && <Badge variant="outline">{experience} framing</Badge>}
          {variant && <Badge variant="secondary">{variant} variant</Badge>}
        </div>
        {(safeStack.riskFlags?.length ?? 0) > 0 && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              Caveats to check first
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {safeStack.riskFlags!.slice(0, 4).map((flag) => (
                <Badge key={flag} variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400">
                  {flag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Variant explainer + auto-generated badge */}
      {(variantExplainer || isAutoGenerated) && (
        <div className="flex flex-col gap-2 mb-6">
          {variantExplainer && (
            <div className="flex items-start gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="text-sm">
                <span className="font-medium">{variant} variant</span>
                <span className="text-muted-foreground"> — {variantExplainer}</span>
              </div>
            </div>
          )}
          {isAutoGenerated && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              Auto-generated by evidence ranking
            </div>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6 pb-6 border-b">
        <span className="flex items-center gap-1.5">
          <FlaskConical className="h-4 w-4" />
          {safeStack.compounds.length} compound
          {safeStack.compounds.length !== 1 ? "s" : ""}
        </span>
        {safeStack.durationWeeks && (
          <span className="flex items-center gap-1.5">
            <Timer className="h-4 w-4" />
            {safeStack.durationWeeks} weeks
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <GitFork className="h-4 w-4" />
          {safeStack._count?.forks ?? 0} fork{(safeStack._count?.forks ?? 0) !== 1 ? "s" : ""}
        </span>
        <span>
          by{" "}
          <Link
            href={`/users/${safeStack.creator.id}`}
            className="hover:underline hover:text-foreground transition-colors"
          >
            {safeStack.creator.name ?? "anonymous"}
          </Link>
        </span>
      </div>

      {/* Bulk vs Cut comparison */}
      {comparisonGoal && comparisonCandidates.length > 0 && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-3">Compare with {comparisonGoal === "BULK" ? "bulk" : "cut"} alternatives</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {comparisonCandidates.map((candidate) => (
              <Link
                key={candidate.slug}
                href={`/stacks/${candidate.slug}`}
                className="rounded-lg border bg-card p-3 hover:border-foreground/30 transition-colors"
              >
                <p className="text-sm font-medium leading-snug line-clamp-2">{candidate.name}</p>
                {candidate.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{candidate.description}</p>
                )}
                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                  <EvidenceScoreBadge score={candidate.evidenceScore} />
                  <span>{candidate.upvotes} upvotes</span>
                  <span>{candidate._count.forks} forks</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Compound table */}
      {safeStack.compounds.length > 0 && (
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
              {safeStack.compounds.map((sc, i) => (
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
                      <p className="text-xs text-muted-foreground/80 italic mt-0.5">
                        {sc.notes}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <CategoryBadge category={sc.compound.category} />
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {sc.dose != null && sc.unit ? (
                      biometrics ? (
                        <div>
                          <span className="font-medium">
                            {scaleDose(sc.dose, null, null, biometrics.lbm, biometrics.sex)} {sc.unit}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            Stack: {sc.dose} {sc.unit}
                          </div>
                        </div>
                      ) : (
                        <>
                          {sc.dose} {sc.unit}
                        </>
                      )
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
          href={`/users/${safeStack.creator.id}`}
          className="hover:underline"
        >
          {safeStack.creator.name ?? "anonymous"}
        </Link>{" "}
        · {safeStack._count.cycles} cycle{safeStack._count.cycles !== 1 ? "s" : ""} run
      </p>
    </div>
  );
}
