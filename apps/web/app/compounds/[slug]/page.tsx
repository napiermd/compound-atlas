import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Clock3, ShieldCheck, Stethoscope, Waves } from "lucide-react";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { buildBiometrics } from "@/lib/dose-utils";
import { CategoryBadge } from "@/components/compound/CategoryBadge";
import { EvidenceScoreBadge } from "@/components/compound/EvidenceScoreBadge";
import { CompoundDetailTabs } from "@/components/compound/CompoundDetailTabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { CompoundDetail } from "@/components/compound/types";

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
  if (score == null) return "Unknown safety profile";
  if (score >= 70) return "Relatively favorable";
  if (score >= 45) return "Mixed risk profile";
  return "Higher side-effect risk";
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

  const raw = await db.compound.findUnique({
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

  if (!raw) notFound();

  // Strip Date objects before passing to client component
  const compound: CompoundDetail = JSON.parse(JSON.stringify(raw));

  const displayAliases = compound.aliases.slice(0, 3);
  const literatureSync = compound.lastLiteratureSync ?? compound.lastResearchSync;
  const refreshedText = literatureSync
    ? new Date(literatureSync).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not synced yet";

  const reviewedText = compound.lastReviewedAt
    ? new Date(compound.lastReviewedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not reviewed";

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
          {compound.studyCount > 0 && (
            <Badge variant="secondary" className="font-normal text-xs">
              {compound.studyCount} stud{compound.studyCount === 1 ? "y" : "ies"}
            </Badge>
          )}
          {compound.isStale && (
            <Badge variant="destructive" className="text-xs">Stale literature</Badge>
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
            {compound.aliases.length > 3 && (
              <span className="text-xs text-muted-foreground px-2 py-0.5">
                +{compound.aliases.length - 3} more
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
            Literature Sync
          </p>
          <p className="text-sm font-semibold">{refreshedText}</p>
        </div>
        <div className="rounded-lg border bg-card px-3 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            Last Reviewed
          </p>
          <p className="text-sm font-semibold">{reviewedText}</p>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Tabbed detail */}
      <CompoundDetailTabs compound={compound} biometrics={biometrics} />
    </div>
  );
}
