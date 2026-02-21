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

const STACK_VARIANTS: Array<{
  key: string;
  label: string;
  constraints: string[];
  maxCompounds: number;
}> = [
  {
    key: "core",
    label: "Core",
    constraints: ["high-evidence"],
    maxCompounds: 6,
  },
  {
    key: "conservative",
    label: "Conservative",
    constraints: [
      "high-evidence",
      "minimal-sides",
      "budget-friendly",
      "otc-only",
      "no-sarms",
    ],
    maxCompounds: 6,
  },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function selectionOffsetFor(
  goalIndex: number,
  experience: ExperienceLevel,
  variantKey: string
): number {
  const expOffset =
    experience === "beginner" ? 0 : experience === "intermediate" ? 1 : 2;
  const variantOffset = variantKey === "core" ? 0 : 3;
  return (goalIndex % 4) + expOffset + variantOffset;
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

  const results: {
    goal: string;
    experience: string;
    variant: string;
    status: string;
    compounds: number;
  }[] = [];
  let updated = 0;
  let created = 0;
  let failed = 0;

  for (let goalIndex = 0; goalIndex < GOALS.length; goalIndex++) {
    const goal = GOALS[goalIndex];
    for (const experience of EXPERIENCE_LEVELS) {
      for (const variant of STACK_VARIANTS) {
        try {
          const generated = await generateStack(
            {
              goal,
              experience,
              constraints: variant.constraints,
              maxCompounds: variant.maxCompounds,
              selectionOffset: selectionOffsetFor(
                goalIndex,
                experience,
                variant.key
              ),
            },
            db
          );

          if (generated.compounds.length === 0) {
            results.push({
              goal,
              experience,
              variant: variant.key,
              status: "skipped (no compounds)",
              compounds: 0,
            });
            continue;
          }

          const stackName = `${generated.name} — ${variant.label}`;

          // Look up existing stack by name + creator
          const existingStack = await db.stack.findFirst({
            where: {
              creatorId: botUser.id,
              goal,
              name: stackName,
            },
            select: { id: true, evidenceScore: true },
          });

          const scoreChanged =
            !existingStack ||
            Math.abs((existingStack.evidenceScore ?? 0) - generated.compositeScore) > 0.5;

          if (existingStack && !scoreChanged) {
            // Score hasn't moved meaningfully — skip update
            results.push({
              goal,
              experience,
              variant: variant.key,
              status: "unchanged",
              compounds: generated.compounds.length,
            });
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
            results.push({
              goal,
              experience,
              variant: variant.key,
              status: "updated",
              compounds: generated.compounds.length,
            });
            updated++;
          } else {
            // Create new stack
            const slug = `${slugify(stackName)}-${Date.now()}`;
            await db.stack.create({
              data: {
                name: stackName,
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
            results.push({
              goal,
              experience,
              variant: variant.key,
              status: "created",
              compounds: generated.compounds.length,
            });
            created++;
          }
        } catch (err) {
          console.error(
            `generate-stacks cron error [${goal}/${experience}/${variant.key}]:`,
            err
          );
          results.push({
            goal,
            experience,
            variant: variant.key,
            status: `error: ${err instanceof Error ? err.message : String(err)}`,
            compounds: 0,
          });
          failed++;
        }
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
