/**
 * Seed auto-generated stacks using the CompoundAtlas stack generation engine.
 *
 * Generates stacks for 15 goals × 3 experience levels = 45 public stacks.
 * Run: npm run db:seed-stacks
 */
import { PrismaClient, StackGoal } from "@prisma/client";
import { generateStack } from "../lib/stack-generator";
import type { ExperienceLevel } from "../lib/stack-generator";

const db = new PrismaClient();

const BOT_EMAIL = "ai@compound-atlas.app";
const BOT_NAME = "CompoundAtlas AI";

// Old hardcoded-seed bot — clean up its stacks if present
const OLD_BOT_EMAIL = "atlas@compound-atlas.app";

// Goals to seed (15 goals × 3 experience levels = 45 stacks)
const SEED_GOALS: StackGoal[] = [
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

async function main() {
  console.log("CompoundAtlas AI Stack Seeder\n");

  // ── Clean up old hardcoded bot user and stacks ──────────────────────────
  const oldBot = await db.user.findUnique({ where: { email: OLD_BOT_EMAIL } });
  if (oldBot) {
    const deleted = await db.stack.deleteMany({ where: { creatorId: oldBot.id } });
    await db.user.delete({ where: { id: oldBot.id } });
    console.log(`Cleaned up old bot user (${deleted.count} stacks deleted)\n`);
  }

  // ── Create / upsert the AI bot user ─────────────────────────────────────
  const botUser = await db.user.upsert({
    where: { email: BOT_EMAIL },
    update: { name: BOT_NAME },
    create: { email: BOT_EMAIL, name: BOT_NAME },
  });
  console.log(`Bot user: ${botUser.name} (${botUser.id})\n`);

  // ── Delete existing AI-generated stacks (full refresh) ──────────────────
  const existing = await db.stack.deleteMany({ where: { creatorId: botUser.id } });
  if (existing.count > 0) {
    console.log(`Deleted ${existing.count} existing AI-generated stacks\n`);
  }

  // ── Generate and save stacks ─────────────────────────────────────────────
  let created = 0;
  let failed = 0;

  for (const goal of SEED_GOALS) {
    for (const experience of EXPERIENCE_LEVELS) {
      try {
        const generated = await generateStack(
          { goal, experience, constraints: [], maxCompounds: 6 },
          db
        );

        if (generated.compounds.length === 0) {
          console.log(`  ⚠ ${goal}/${experience}: no compounds selected — skipping`);
          failed++;
          continue;
        }

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

        const compoundNames = generated.compounds.map((c) => c.name).join(", ");
        console.log(`  ✓ ${generated.name}`);
        console.log(`    Score: ${generated.compositeScore} | ${generated.compounds.length} compounds`);
        console.log(`    ${compoundNames}`);
        if (generated.warnings.length) {
          console.log(`    ⚠ ${generated.warnings[0]}`);
        }
        console.log();

        created++;
      } catch (err) {
        console.error(`  ✗ ${goal}/${experience}: ${err}`);
        failed++;
      }
    }
  }

  console.log(`\n${"─".repeat(50)}`);
  console.log(`Done. ${created} stacks created, ${failed} failed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
