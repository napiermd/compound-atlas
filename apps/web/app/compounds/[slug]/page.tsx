import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  AlertTriangle,
  ChevronRight,
  Clock3,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  Waves,
} from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildBiometrics } from "@/lib/dose-utils";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { CompoundDetailTabs } from "@/components/compound/CompoundDetailTabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CompoundDetail } from "@/components/compound/types";
import { getStaleThresholdDays, isCompoundStale } from "@/lib/compound-freshness";
import { SIGNAL_VOCAB, riskLabelFromScore } from "@/lib/signal-vocabulary";

interface Props {
  params: { slug: string };
}

function evidenceReadout(score: number | null): string {
  if (score == null) return "No score yet";
  if (score >= 75) return "Strong evidence";
  if (score >= 50) return "Moderate evidence";
  if (score >= 25) return "Emerging evidence";
  return "Early-stage evidence";
}

function safetyReadout(score: number | null): string {
  return riskLabelFromScore(score);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const compound = await db.compound.findUnique({
    where: { slug: params.slug },
    select: { name: true, description: true, category: true },
  });
  if (!compound) return { title: "Not Found" };
  return {
    title: `${compound.name} — CompoundAtlas`,
    description: compound.description?.slice(0, 160) ?? undefined,
  };
}

export default async function CompoundDetailPage({ params }: Props) {
  // Optional biometric fetch — won't throw if unauthenticated
  const session = await auth().catch(() => null);
  let biometrics = null;
  if (session?.user?.id) {
    const u = await db.user.findUnique({
      where: { id: session.user.id },
      select: { sex: true, weightLbs: true, heightFt: true, heightIn: true },
    });
    if (u?.sex && u.weightLbs && u.heightFt != null && u.heightIn != null) {
      biometrics = buildBiometrics(u.sex, u.weightLbs, u.heightFt, u.heightIn);
    }
  }

  let raw: unknown = null;
  try {
    raw = await db.compound.findUnique({
      where: { slug: params.slug },
      include: {
        sideEffects: { orderBy: { severity: "asc" } },
        mechanisms: true,
        interactions: {
          include: {
            target: { select: { name: true, slug: true, category: true } },
          },
        },
        studies: {
          include: {
            study: {
              select: {
                id: true,
                pmid: true,
                title: true,
                studyType: true,
                evidenceLevel: true,
                year: true,
                sampleSize: true,
                fullTextUrl: true,
                tldr: true,
              },
            },
          },
          take: 10,
          orderBy: { study: { year: "desc" } },
        },
      },
    });
  } catch {
    // Backward-compat fallback for deployments where newest Prisma migrations
    // have not been applied yet. Avoid hard-crashing compound pages.
    raw = await db.compound.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        aliases: true,
        category: true,
        description: true,
        legalStatus: true,
        evidenceScore: true,
        safetyScore: true,
        studyCount: true,
        clinicalPhase: true,
        sideEffects: {
          orderBy: { severity: "asc" },
        },
        mechanisms: true,
        interactions: {
          include: {
            target: { select: { name: true, slug: true, category: true } },
          },
        },
        studies: {
          include: {
            study: {
              select: {
                id: true,
                pmid: true,
                title: true,
                studyType: true,
                evidenceLevel: true,
                year: true,
                sampleSize: true,
                fullTextUrl: true,
                tldr: true,
              },
            },
          },
          take: 10,
          orderBy: { study: { year: "desc" } },
        },
      },
    });
  }

  if (!raw) notFound();

  // Strip Date objects before passing to client component
  const compound: CompoundDetail = JSON.parse(JSON.stringify(raw));

  // Runtime-safe defaults for partially migrated DB rows.
  const safeCompound: CompoundDetail = {
    ...compound,
    aliases: Array.isArray(compound.aliases) ? compound.aliases : [],
    routeOfAdmin: Array.isArray(compound.routeOfAdmin) ? compound.routeOfAdmin : [],
    sideEffects: Array.isArray(compound.sideEffects) ? compound.sideEffects : [],
    interactions: Array.isArray(compound.interactions) ? compound.interactions : [],
    mechanisms: Array.isArray(compound.mechanisms) ? compound.mechanisms : [],
    studies: Array.isArray(compound.studies) ? compound.studies : [],
    safetyCaveats: Array.isArray(compound.safetyCaveats) ? compound.safetyCaveats : [],
    legalCaveats: Array.isArray(compound.legalCaveats) ? compound.legalCaveats : [],
    literatureLinks: compound.literatureLinks ?? null,
    halfLife: compound.halfLife ?? null,
    onset: compound.onset ?? null,
    duration: compound.duration ?? null,
    scoreBreakdown: compound.scoreBreakdown ?? null,
    lastResearchSync: compound.lastResearchSync ?? null,
    lastReviewedAt: compound.lastReviewedAt ?? null,
    evidenceLevel: compound.evidenceLevel ?? null,
    metaAnalysisCount: compound.metaAnalysisCount ?? 0,
  };

  const aliases = safeCompound.aliases;
  const safetyCaveats = safeCompound.safetyCaveats;
  const legalCaveats = safeCompound.legalCaveats;

  const displayAliases = aliases.slice(0, 3);
  const literatureLinks = Array.isArray(safeCompound.literatureLinks)
    ? (safeCompound.literatureLinks as Array<{
        title?: string;
        url?: string;
        source?: string;
        year?: number;
        kind?: string;
      }>).filter((item) => !!item?.title && !!item?.url)
    : [];

  const refreshedText = safeCompound.lastResearchSync
    ? new Date(safeCompound.lastResearchSync).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not synced yet";
  const reviewedText = safeCompound.lastReviewedAt
    ? new Date(safeCompound.lastReviewedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not reviewed yet";
  const staleThresholdDays = getStaleThresholdDays();
  const isStale = isCompoundStale(safeCompound.lastResearchSync);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link href="/compounds" className="hover:text-foreground transition-colors">
          Compounds
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{compound.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-3xl font-bold tracking-tight leading-tight">
            {compound.name}
          </h1>
          <EvidenceScoreBadge
            score={compound.evidenceScore}
            size="lg"
            className="shrink-0"
          />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <CategoryBadge category={compound.category} size="md" />
          {compound.legalStatus !== "LEGAL" && (
            <Badge variant="outline">
              {compound.legalStatus === "PRESCRIPTION"
                ? "Prescription Only"
                : compound.legalStatus === "GRAY_MARKET"
                  ? "Gray Market"
                  : compound.legalStatus === "SCHEDULED"
                    ? "Scheduled Substance"
                    : compound.legalStatus === "RESEARCH_ONLY"
                      ? "Research Only"
                      : compound.legalStatus}
            </Badge>
          )}
          {compound.evidenceLevel && (
            <Badge variant="outline" className="font-mono text-xs">
              Evidence Level {compound.evidenceLevel}
            </Badge>
          )}
          {compound.studyCount > 0 && (
            <Badge variant="secondary" className="font-normal text-xs">
              {compound.studyCount} stud{compound.studyCount === 1 ? "y" : "ies"}
            </Badge>
          )}
        </div>

        {displayAliases.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {displayAliases.map((a) => (
              <span
                key={a}
                className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5"
              >
                {a}
              </span>
            ))}
            {aliases.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5">
                +{aliases.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Description */}
      {compound.description && (
        <>
          <p className="text-muted-foreground leading-relaxed text-sm whitespace-pre-line mb-6">
            {compound.description}
          </p>
        </>
      )}

      {(legalCaveats.length > 0 || safetyCaveats.length > 0) && (
        <div className="mb-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
          <p className="text-sm font-semibold flex items-center gap-2 text-red-700 dark:text-red-300">
            <AlertTriangle className="h-4 w-4" />
            Safety & legal caution
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Educational database only — not medical or legal advice.
          </p>
          <div className="grid gap-3 mt-3 sm:grid-cols-2">
            {safetyCaveats.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Safety</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                  {safetyCaveats.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {legalCaveats.length > 0 && (
              <div>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">Legal / compliance</p>
                <ul className="list-disc pl-4 space-y-1 text-xs text-muted-foreground">
                  {legalCaveats.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {literatureLinks.length > 0 && (
        <div className="mb-6 rounded-lg border bg-card p-4">
          <p className="text-sm font-semibold mb-2">Current literature links</p>
          <div className="space-y-1.5">
            {literatureLinks.slice(0, 6).map((link) => (
              <a
                key={`${link.url}-${link.title}`}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{link.title}</span>
                {link.year && <span className="opacity-70">({link.year})</span>}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <Waves className="h-3.5 w-3.5" />
            Evidence
          </p>
          <p className="text-sm font-semibold">
            {evidenceReadout(compound.evidenceScore)}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Safety
          </p>
          <p className="text-sm font-semibold">{safetyReadout(compound.safetyScore)}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <Stethoscope className="h-3.5 w-3.5" />
            Clinical Status
          </p>
          <p className="text-sm font-semibold">
            {compound.clinicalPhase ?? "No formal phase listed"}
          </p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            Last Sync
          </p>
          <p className="text-sm font-semibold">{refreshedText}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
            Last Reviewed
          </p>
          <p className="text-sm font-semibold">{reviewedText}</p>
        </div>
      </div>

      {isStale && (
        <div className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
          {SIGNAL_VOCAB.stale}: this compound has not been synced in the last {staleThresholdDays} days.
        </div>
      )}

      <Separator className="mb-6" />

      {/* Tabbed detail */}
      <CompoundDetailTabs compound={safeCompound} biometrics={biometrics} />
    </div>
  );
}
