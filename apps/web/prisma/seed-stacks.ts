/**
 * Seed pre-built public stacks created by the CompoundAtlas bot user.
 * Run: npm run db:seed-stacks
 */
import { PrismaClient, StackGoal } from "@prisma/client";

const db = new PrismaClient();

const BOT_EMAIL = "atlas@compound-atlas.app";
const BOT_NAME = "CompoundAtlas";

interface StackDef {
  name: string;
  slug: string;
  description: string;
  goal: StackGoal;
  durationWeeks: number;
  compounds: {
    slug: string;
    dose?: number;
    unit?: string;
    frequency?: string;
    startWeek?: number;
    endWeek?: number;
    notes?: string;
  }[];
}

const STACKS: StackDef[] = [
  {
    name: "TRT Optimization Stack",
    slug: "trt-optimization-stack",
    description:
      "A foundational testosterone replacement protocol with supporting micronutrients. " +
      "Optimizes free testosterone, estrogen balance, and training adaptation. " +
      "Suitable for clinically diagnosed hypogonadism or TRT patients.",
    goal: StackGoal.RECOMP,
    durationWeeks: 16,
    compounds: [
      { slug: "testosterone-cypionate", dose: 100, unit: "mg", frequency: "weekly", startWeek: 1, notes: "Cruise dose — adjust with physician" },
      { slug: "vitamin-d3", dose: 5000, unit: "IU", frequency: "daily", startWeek: 1 },
      { slug: "magnesium-glycinate", dose: 400, unit: "mg", frequency: "daily", startWeek: 1, notes: "Take at night for sleep benefit" },
      { slug: "tongkat-ali", dose: 400, unit: "mg", frequency: "daily", startWeek: 1, notes: "Supports LH sensitivity and free T" },
      { slug: "creatine-monohydrate", dose: 5, unit: "g", frequency: "daily", startWeek: 1 },
    ],
  },
  {
    name: "Recomp Blast",
    slug: "recomp-blast",
    description:
      "An aggressive recomposition stack combining anabolic support, performance enhancers, " +
      "and GH secretagogues. Targets simultaneous fat loss and muscle gain. " +
      "Intermediate to advanced users only.",
    goal: StackGoal.RECOMP,
    durationWeeks: 12,
    compounds: [
      { slug: "creatine-monohydrate", dose: 5, unit: "g", frequency: "daily", startWeek: 1 },
      { slug: "beta-alanine", dose: 3.2, unit: "g", frequency: "daily", startWeek: 1 },
      { slug: "citrulline-malate", dose: 6, unit: "g", frequency: "daily", startWeek: 1, notes: "Pre-workout" },
      { slug: "mk-677", dose: 10, unit: "mg", frequency: "daily", startWeek: 1, notes: "Take before bed for GH pulse" },
      { slug: "rad-140", dose: 10, unit: "mg", frequency: "daily", startWeek: 1, endWeek: 12 },
      { slug: "vitamin-d3", dose: 5000, unit: "IU", frequency: "daily", startWeek: 1 },
    ],
  },
  {
    name: "GLP-1 Assisted Cut",
    slug: "glp-1-assisted-cut",
    description:
      "A modern fat loss protocol anchored by a GLP-1 receptor agonist for appetite suppression " +
      "and metabolic improvement. Berberine amplifies insulin sensitivity. " +
      "Creatine and fish oil preserve muscle and reduce inflammation during the cut.",
    goal: StackGoal.CUT,
    durationWeeks: 16,
    compounds: [
      { slug: "semaglutide", dose: 0.5, unit: "mg", frequency: "weekly", startWeek: 1, notes: "Escalate per tolerance: 0.25 → 0.5 → 1.0 mg/week" },
      { slug: "berberine", dose: 500, unit: "mg", frequency: "3x/day", startWeek: 1, notes: "With meals" },
      { slug: "creatine-monohydrate", dose: 5, unit: "g", frequency: "daily", startWeek: 1, notes: "Preserves lean mass in caloric deficit" },
      { slug: "fish-oil", dose: 3, unit: "g", frequency: "daily", startWeek: 1, notes: "3g EPA+DHA combined" },
      { slug: "coq10", dose: 200, unit: "mg", frequency: "daily", startWeek: 1 },
    ],
  },
  {
    name: "Cognitive Enhancement Stack",
    slug: "cognitive-enhancement-stack",
    description:
      "A precision nootropic protocol combining cholinergic support, neurogenesis, " +
      "NAD+ metabolism, and wakefulness. Targets executive function, memory, " +
      "and sustained focus. Best for knowledge workers and high-output periods.",
    goal: StackGoal.COGNITIVE,
    durationWeeks: 8,
    compounds: [
      { slug: "alpha-gpc", dose: 300, unit: "mg", frequency: "2x/day", startWeek: 1, notes: "Morning and early afternoon" },
      { slug: "lions-mane", dose: 500, unit: "mg", frequency: "2x/day", startWeek: 1, notes: "With meals — takes 2-4 weeks for peak neurogenic effect" },
      { slug: "l-theanine", dose: 200, unit: "mg", frequency: "daily", startWeek: 1, notes: "Stack with morning coffee for clean focus" },
      { slug: "modafinil", dose: 100, unit: "mg", frequency: "daily", startWeek: 1, notes: "As needed, not daily — tolerance develops quickly" },
      { slug: "nad-precursors", dose: 500, unit: "mg", frequency: "daily", startWeek: 1, notes: "Morning with food" },
    ],
  },
  {
    name: "Joint & Recovery Protocol",
    slug: "joint-recovery-protocol",
    description:
      "A regenerative peptide protocol targeting tendon, ligament, and joint repair. " +
      "BPC-157 accelerates soft tissue healing; TB-500 promotes systemic recovery. " +
      "Foundational support compounds reduce inflammation and optimize repair environment.",
    goal: StackGoal.RECOVERY,
    durationWeeks: 10,
    compounds: [
      { slug: "bpc-157", dose: 250, unit: "mcg", frequency: "2x/day", startWeek: 1, notes: "SubQ or oral — SubQ preferred for local injury" },
      { slug: "tb-500", dose: 2, unit: "mg", frequency: "2x/week", startWeek: 1, endWeek: 6, notes: "Loading phase: 2mg 2x/week" },
      { slug: "tb-500", dose: 2, unit: "mg", frequency: "weekly", startWeek: 7, endWeek: 10, notes: "Maintenance: 2mg/week" },
      { slug: "fish-oil", dose: 3, unit: "g", frequency: "daily", startWeek: 1 },
      { slug: "vitamin-d3", dose: 5000, unit: "IU", frequency: "daily", startWeek: 1 },
      { slug: "magnesium-glycinate", dose: 400, unit: "mg", frequency: "daily", startWeek: 1 },
    ],
  },
  {
    name: "Deep Sleep Stack",
    slug: "deep-sleep-stack",
    description:
      "A synergistic sleep optimization protocol targeting sleep onset, " +
      "slow-wave depth, and GH secretion. Magnesium and L-theanine calm the CNS; " +
      "ashwagandha lowers cortisol; MK-677 amplifies the overnight GH pulse.",
    goal: StackGoal.SLEEP,
    durationWeeks: 8,
    compounds: [
      { slug: "magnesium-glycinate", dose: 400, unit: "mg", frequency: "daily", startWeek: 1, notes: "30 min before bed" },
      { slug: "l-theanine", dose: 200, unit: "mg", frequency: "daily", startWeek: 1, notes: "30 min before bed" },
      { slug: "ashwagandha", dose: 600, unit: "mg", frequency: "daily", startWeek: 1, notes: "Evening dose — reduces cortisol at night" },
      { slug: "mk-677", dose: 10, unit: "mg", frequency: "daily", startWeek: 1, notes: "Immediately before sleep — maximizes GH pulse" },
    ],
  },
  {
    name: "Longevity Protocol",
    slug: "longevity-protocol",
    description:
      "An evidence-informed healthspan extension stack targeting NAD+ restoration, " +
      "mitochondrial function, metabolic optimization, and cellular cleanup. " +
      "Designed for long-term use with strong safety profiles across all compounds.",
    goal: StackGoal.LONGEVITY,
    durationWeeks: 52,
    compounds: [
      { slug: "nad-precursors", dose: 500, unit: "mg", frequency: "daily", startWeek: 1, notes: "Morning with food" },
      { slug: "coq10", dose: 200, unit: "mg", frequency: "daily", startWeek: 1, notes: "With fat-containing meal for absorption" },
      { slug: "vitamin-d3", dose: 5000, unit: "IU", frequency: "daily", startWeek: 1 },
      { slug: "fish-oil", dose: 3, unit: "g", frequency: "daily", startWeek: 1 },
      { slug: "berberine", dose: 500, unit: "mg", frequency: "2x/day", startWeek: 1, notes: "With meals — activates AMPK pathway" },
      { slug: "mots-c", dose: 5, unit: "mg", frequency: "3x/week", startWeek: 1, notes: "SubQ injection — cycling recommended" },
    ],
  },
  {
    name: "GH Peptide Protocol",
    slug: "gh-peptide-protocol",
    description:
      "A GHRH/GHRP combination protocol for natural GH axis stimulation. " +
      "CJC-1295 extends GHRH half-life; ipamorelin provides clean GH pulses without cortisol spikes. " +
      "BPC-157 and TB-500 amplify the regenerative benefits.",
    goal: StackGoal.RECOVERY,
    durationWeeks: 12,
    compounds: [
      { slug: "mk-677", dose: 25, unit: "mg", frequency: "daily", startWeek: 1, notes: "Oral GH secretagogue — take before sleep" },
      { slug: "cjc-1295", dose: 100, unit: "mcg", frequency: "3x/week", startWeek: 1, notes: "SubQ injection pre-sleep — synergizes with ipamorelin" },
      { slug: "ipamorelin", dose: 100, unit: "mcg", frequency: "3x/week", startWeek: 1, notes: "SubQ — inject same time as CJC-1295" },
      { slug: "bpc-157", dose: 250, unit: "mcg", frequency: "2x/day", startWeek: 1 },
      { slug: "tb-500", dose: 2, unit: "mg", frequency: "weekly", startWeek: 1 },
    ],
  },
  {
    name: "Beginner Nootropic Stack",
    slug: "beginner-nootropic-stack",
    description:
      "A safe, well-tolerated entry point for cognitive enhancement. " +
      "All compounds have strong safety profiles and meaningful evidence. " +
      "L-theanine smooths caffeine; lion's mane builds neurogenesis over time; " +
      "foundational nutrients fill common deficits that impair cognition.",
    goal: StackGoal.COGNITIVE,
    durationWeeks: 8,
    compounds: [
      { slug: "l-theanine", dose: 200, unit: "mg", frequency: "daily", startWeek: 1, notes: "With morning coffee for clean, jitter-free focus" },
      { slug: "lions-mane", dose: 500, unit: "mg", frequency: "daily", startWeek: 1, notes: "With food — neurogenic effects build over 4 weeks" },
      { slug: "alpha-gpc", dose: 300, unit: "mg", frequency: "daily", startWeek: 1, notes: "Morning dose before cognitively demanding tasks" },
      { slug: "fish-oil", dose: 2, unit: "g", frequency: "daily", startWeek: 1, notes: "2g EPA+DHA — foundational for brain health" },
      { slug: "vitamin-d3", dose: 5000, unit: "IU", frequency: "daily", startWeek: 1, notes: "Addresses near-universal deficiency" },
    ],
  },
  {
    name: "Advanced Bulk",
    slug: "advanced-bulk",
    description:
      "A high-output anabolic protocol for serious muscle-building phases. " +
      "Combines performance anabolics with evidence-based training compounds. " +
      "MK-677 dramatically boosts appetite and GH output. Advanced users only.",
    goal: StackGoal.BULK,
    durationWeeks: 16,
    compounds: [
      { slug: "testosterone-cypionate", dose: 400, unit: "mg", frequency: "weekly", startWeek: 1 },
      { slug: "nandrolone-phenylpropionate", dose: 100, unit: "mg", frequency: "2x/week", startWeek: 1 },
      { slug: "creatine-monohydrate", dose: 5, unit: "g", frequency: "daily", startWeek: 1 },
      { slug: "beta-alanine", dose: 3.2, unit: "g", frequency: "daily", startWeek: 1 },
      { slug: "citrulline-malate", dose: 8, unit: "g", frequency: "daily", startWeek: 1, notes: "Pre-workout pump and endurance" },
      { slug: "mk-677", dose: 25, unit: "mg", frequency: "daily", startWeek: 1, notes: "Drives hunger and GH — take before sleep" },
    ],
  },
];

async function main() {
  console.log("Seeding pre-built stacks...\n");

  // Upsert bot user
  const botUser = await db.user.upsert({
    where: { email: BOT_EMAIL },
    update: { name: BOT_NAME },
    create: {
      email: BOT_EMAIL,
      name: BOT_NAME,
    },
  });
  console.log(`Bot user: ${botUser.name} (${botUser.id})\n`);

  // Load all compound IDs from DB
  const allCompounds = await db.compound.findMany({
    select: { id: true, slug: true, evidenceScore: true },
  });
  const slugToCompound = new Map(
    allCompounds.map((c) => [c.slug, c])
  );

  let created = 0;
  let skipped = 0;

  for (const def of STACKS) {
    // Skip if already exists
    const existing = await db.stack.findUnique({ where: { slug: def.slug } });
    if (existing) {
      console.log(`  ↩ Already exists: ${def.name}`);
      skipped++;
      continue;
    }

    // Resolve compound IDs, skip unknown slugs
    const resolvedCompounds: {
      compoundId: string;
      dose?: number;
      unit?: string;
      frequency?: string;
      startWeek?: number;
      endWeek?: number;
      notes?: string;
    }[] = [];

    const seenCompoundIds = new Set<string>();

    for (const c of def.compounds) {
      const compound = slugToCompound.get(c.slug);
      if (!compound) {
        console.warn(`    ⚠ Unknown slug: ${c.slug} — skipping`);
        continue;
      }
      // StackCompound has @@unique([stackId, compoundId]) so skip dupes
      if (seenCompoundIds.has(compound.id)) continue;
      seenCompoundIds.add(compound.id);

      resolvedCompounds.push({
        compoundId: compound.id,
        dose: c.dose,
        unit: c.unit,
        frequency: c.frequency,
        startWeek: c.startWeek,
        endWeek: c.endWeek,
        notes: c.notes,
      });
    }

    // Compute average evidence score
    let evidenceScore: number | null = null;
    const scored = resolvedCompounds
      .map((rc) => slugToCompound.get(
        allCompounds.find((c) => c.id === rc.compoundId)?.slug ?? ""
      ))
      .filter((c) => c?.evidenceScore != null);

    if (scored.length > 0) {
      evidenceScore =
        scored.reduce((sum, c) => sum + (c!.evidenceScore ?? 0), 0) /
        scored.length;
    }

    await db.stack.create({
      data: {
        name: def.name,
        slug: def.slug,
        description: def.description,
        goal: def.goal,
        durationWeeks: def.durationWeeks,
        isPublic: true,
        evidenceScore,
        creatorId: botUser.id,
        compounds: {
          create: resolvedCompounds,
        },
      },
    });

    console.log(`  ✓ Created: ${def.name} (${resolvedCompounds.length} compounds)`);
    created++;
  }

  console.log(`\nDone. ${created} created, ${skipped} skipped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
