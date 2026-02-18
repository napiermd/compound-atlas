import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/cycle/StatusBadge";
import { CycleDetailView } from "@/components/cycle/CycleDetailView";
import type { CycleData } from "@/components/cycle/types";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth();
  if (!session?.user?.id) return { title: "Cycle" };
  const cycle = await db.cycle.findFirst({
    where: { id: params.id, userId: session.user.id },
    select: { name: true },
  });
  return { title: cycle ? `${cycle.name} — CompoundAtlas` : "Not Found" };
}

export default async function CycleDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const raw = await db.cycle.findFirst({
    where: { id: params.id, userId: session.user.id },
    include: {
      entries: { orderBy: { date: "asc" } },
      bloodwork: { orderBy: { date: "asc" } },
      stack: {
        include: {
          compounds: {
            include: {
              compound: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  category: true,
                  doseUnit: true,
                },
              },
            },
            orderBy: { startWeek: "asc" },
          },
        },
      },
    },
  });

  if (!raw) notFound();

  const cycle: CycleData = JSON.parse(JSON.stringify(raw));

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
        <Link
          href="/cycles"
          className="hover:text-foreground transition-colors"
        >
          Cycles
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">{raw.name}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold tracking-tight">{raw.name}</h1>
          <StatusBadge status={cycle.status} />
        </div>
        {cycle.stack && (
          <Link
            href={`/stacks/${cycle.stack.slug}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {cycle.stack.name}
          </Link>
        )}
      </div>

      {raw.notes && (
        <p className="text-sm text-muted-foreground mb-6 whitespace-pre-line">
          {raw.notes}
        </p>
      )}

      <CycleDetailView cycle={cycle} />
    </div>
  );
}
