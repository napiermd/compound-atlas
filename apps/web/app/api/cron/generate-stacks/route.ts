/**
 * Weekly cron endpoint — regenerates all AI-seeded stacks from live compound scores.
 *
 * Protected by CRON_SECRET.
 * Triggered by Vercel Cron weekly (Sunday midnight UTC).
 *
 * Add to vercel.json:
 *   "crons": [{ "path": "/api/cron/generate-stacks", "schedule": "0 0 * * 0" }]
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateStack } from "@/lib/stack-generator";
import { StackGoal } from "@prisma/client";
import type { ExperienceLevel } from "@/lib/stack-generator";

const BOT_EMAIL = "ai@compound-atlas.app";
const BOT_NAME = "CompoundAtlas AI";

const GOALS: StackGoal[] = [
  StackGoal.RECOMP,
  StackGoal.BULK,
  StackGoal.CUT,
  StackGoal.COGNITIVE,
  StackGoal.SLEEP,
  StackGoal.LONGEVITY,
  StackGoal.RECOVERY,
  StackGoal.JOINT_HEALTH,
  StackGoal.MOOD,
  StackGoal.LIBIDO,
  StackGoal.GENERAL_HEALTH,
  StackGoal.CUSTOM,
  StackGoal.ATHLETIC_PERFORMANCE,
  StackGoal.HORMONE_OPTIMIZATION,
  StackGoal.METABOLIC_HEALTH,
];

const EXPERIENCE_LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(req: Request) {
  // ── Auth: verify CRON_SECRET ──────────────────────────────────────────
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Upsert bot user ───────────────────────────────────────────────────
  const botUser = await db.user.upsert({
    where: { email: BOT_EMAIL },
    update: { name: BOT_NAME },
    create: { email: BOT_EMAIL, name: BOT_NAME },
  });

  const results: { goal: string; experience: string; status: string; compounds: number }[] = [];
  let updated = 0;
  let created = 0;
  let failed = 0;

  for (const goal of GOALS) {
    for (const experience of EXPERIENCE_LEVELS) {
      try {
        const generated = await generateStack(
          { goal, experience, constraints: [], maxCompounds: 6 },
          db
        );

        if (generated.compounds.length === 0) {
          results.push({ goal, experience, status: "skipped (no compounds)", compounds: 0 });
          continue;
        }

        // Look up existing stack by name + creator
        const existingStack = await db.stack.findFirst({
          where: {
            creatorId: botUser.id,
            goal,
            name: generated.name,
          },
          select: { id: true, evidenceScore: true },
        });

        const scoreChanged =
          !existingStack ||
          Math.abs((existingStack.evidenceScore ?? 0) - generated.compositeScore) > 0.5;

        if (existingStack && !scoreChanged) {
          // Score hasn't moved meaningfully — skip update
          results.push({ goal, experience, status: "unchanged", compounds: generated.compounds.length });
          continue;
        }

        if (existingStack) {
          // Update existing stack
          await db.stackCompound.deleteMany({ where: { stackId: existingStack.id } });
          await db.stack.update({
            where: { id: existingStack.id },
            data: {
              description: generated.description,
              durationWeeks: generated.durationWeeks,
              evidenceScore: generated.compositeScore,
              compounds: {
                create: generated.compounds.map((c) => ({
                  compoundId: c.compoundId,
                  dose: c.dose,
                  unit: c.unit,
                  frequency: c.frequency,
                  startWeek: c.startWeek,
                  notes: c.reasoning,
                })),
              },
            },
          });
          results.push({ goal, experience, status: "updated", compounds: generated.compounds.length });
          updated++;
        } else {
          // Create new stack
          const slug = `${slugify(generated.name)}-${Date.now()}`;
          await db.stack.create({
            data: {
              name: generated.name,
              slug,
              description: generated.description,
              goal,
              durationWeeks: generated.durationWeeks,
              isPublic: true,
              evidenceScore: generated.compositeScore,
              creatorId: botUser.id,
              compounds: {
                create: generated.compounds.map((c) => ({
                  compoundId: c.compoundId,
                  dose: c.dose,
                  unit: c.unit,
                  frequency: c.frequency,
                  startWeek: c.startWeek,
                  notes: c.reasoning,
                })),
              },
            },
          });
          results.push({ goal, experience, status: "created", compounds: generated.compounds.length });
          created++;
        }
      } catch (err) {
        console.error(`generate-stacks cron error [${goal}/${experience}]:`, err);
        results.push({ goal, experience, status: `error: ${err instanceof Error ? err.message : String(err)}`, compounds: 0 });
        failed++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    summary: { created, updated, failed, total: results.length },
    results,
  });
}

// Allow Vercel Cron to call via GET as well
export { POST as GET };
