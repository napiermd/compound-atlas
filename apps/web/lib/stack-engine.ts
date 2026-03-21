/**
 * Stack Engine — scores and ranks stacks for a user based on their health profile,
 * lab results, and goals. Pure functions, no DB access (caller provides data).
 */

import type {
  HealthGoal,
  ActivityLevel,
  BiologicalSex,
  StackGoal,
  CompoundCategory,
} from "@prisma/client";

// ─── Types ───────────────────────────────────────────

export interface UserPhenotype {
  age: number | null;
  biologicalSex: BiologicalSex | null;
  weightKg: number | null;
  bodyFatPercent: number | null;
  activityLevel: ActivityLevel | null;
  sleepHours: number | null;
  goals: HealthGoal[];
  conditions: string[];
  medications: string[];
}

export interface LabSnapshot {
  marker: string;
  value: number;
  unit: string;
  refRangeLow: number | null;
  refRangeHigh: number | null;
}

export interface StackCandidate {
  id: string;
  name: string;
  slug: string;
  goal: StackGoal;
  evidenceScore: number | null;
  upvotes: number;
  compounds: Array<{
    compound: {
      id: string;
      name: string;
      slug: string;
      category: CompoundCategory;
      evidenceScore: number | null;
      safetyScore: number | null;
    };
    dose: number | null;
    unit: string | null;
  }>;
}

export interface ScoredStack {
  stack: StackCandidate;
  totalScore: number;
  goalFit: number;
  evidenceFit: number;
  safetyFit: number;
  phenotypeFit: number;
  labFit: number;
  reasons: string[];
  warnings: string[];
}

// ─── Goal Mapping ────────────────────────────────────

const HEALTH_GOAL_TO_STACK_GOAL: Record<HealthGoal, StackGoal[]> = {
  MUSCLE_GROWTH: ["BULK", "RECOMP", "ATHLETIC_PERFORMANCE"],
  FAT_LOSS: ["CUT", "RECOMP", "METABOLIC_HEALTH"],
  COGNITIVE_ENHANCEMENT: ["COGNITIVE", "MOOD"],
  SLEEP_OPTIMIZATION: ["SLEEP", "RECOVERY"],
  LONGEVITY: ["LONGEVITY", "GENERAL_HEALTH"],
  HORMONE_OPTIMIZATION: ["HORMONE_OPTIMIZATION", "LIBIDO"],
  GENERAL_WELLNESS: ["GENERAL_HEALTH", "LONGEVITY"],
  ATHLETIC_PERFORMANCE: ["ATHLETIC_PERFORMANCE", "RECOMP", "RECOVERY"],
  STRESS_MANAGEMENT: ["MOOD", "SLEEP", "COGNITIVE"],
  JOINT_HEALTH: ["JOINT_HEALTH", "RECOVERY"],
};

// ─── Contraindication Rules ──────────────────────────

const CONDITION_CONTRAINDICATIONS: Record<string, CompoundCategory[]> = {
  liver_disease: ["ANABOLIC", "SARM"],
  kidney_disease: ["ANABOLIC", "SARM"],
  hypertension: ["ANABOLIC", "FAT_LOSS"],
  heart_disease: ["ANABOLIC", "FAT_LOSS", "GH_SECRETAGOGUE"],
  pregnancy: ["ANABOLIC", "SARM", "PEPTIDE", "FAT_LOSS", "HORMONAL"],
};

// ─── Scoring Functions ───────────────────────────────

function scoreGoalFit(stack: StackCandidate, phenotype: UserPhenotype): number {
  if (phenotype.goals.length === 0) return 50;
  const matchedGoals = phenotype.goals.flatMap(
    (g) => HEALTH_GOAL_TO_STACK_GOAL[g] ?? []
  );
  return matchedGoals.includes(stack.goal) ? 100 : 20;
}

function scoreEvidence(stack: StackCandidate): number {
  if (stack.evidenceScore != null) return Math.min(stack.evidenceScore, 100);
  const scored = stack.compounds
    .map((c) => c.compound.evidenceScore)
    .filter((s): s is number => s != null);
  if (scored.length === 0) return 30;
  return scored.reduce((a, b) => a + b, 0) / scored.length;
}

function scoreSafety(
  stack: StackCandidate,
  phenotype: UserPhenotype
): { score: number; warnings: string[] } {
  const warnings: string[] = [];
  let penalty = 0;

  for (const sc of stack.compounds) {
    const cat = sc.compound.category;

    // Check condition contraindications
    for (const condition of phenotype.conditions) {
      const contra = CONDITION_CONTRAINDICATIONS[condition.toLowerCase()];
      if (contra?.includes(cat)) {
        warnings.push(
          `${sc.compound.name} (${cat}) may be contraindicated with ${condition}`
        );
        penalty += 30;
      }
    }

    // Age-based warnings
    if (phenotype.age != null && phenotype.age < 25) {
      if (cat === "ANABOLIC" || cat === "SARM" || cat === "HORMONAL") {
        warnings.push(
          `${sc.compound.name} not recommended under age 25`
        );
        penalty += 20;
      }
    }

    // Apply compound safety score
    if (sc.compound.safetyScore != null && sc.compound.safetyScore < 40) {
      penalty += 10;
    }
  }

  return { score: Math.max(0, 100 - penalty), warnings };
}

function scorePhenotypeFit(
  stack: StackCandidate,
  phenotype: UserPhenotype
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 50; // neutral baseline

  // Activity level bonus
  if (phenotype.activityLevel === "ATHLETE" || phenotype.activityLevel === "VERY_ACTIVE") {
    if (["BULK", "RECOMP", "ATHLETIC_PERFORMANCE", "RECOVERY"].includes(stack.goal)) {
      score += 20;
      reasons.push("Matches your high activity level");
    }
  }

  // Sleep optimization for poor sleepers
  if (phenotype.sleepHours != null && phenotype.sleepHours < 6) {
    if (stack.goal === "SLEEP" || stack.goal === "RECOVERY") {
      score += 15;
      reasons.push("Targeted for your sleep needs");
    }
  }

  // Body composition context
  if (phenotype.bodyFatPercent != null) {
    if (phenotype.bodyFatPercent > 25 && stack.goal === "CUT") {
      score += 10;
      reasons.push("Aligned with your body composition goals");
    }
    if (phenotype.bodyFatPercent < 15 && stack.goal === "BULK") {
      score += 10;
      reasons.push("Good foundation for lean bulking");
    }
  }

  return { score: Math.min(100, score), reasons };
}

function scoreLabFit(
  stack: StackCandidate,
  labs: LabSnapshot[]
): { score: number; reasons: string[] } {
  if (labs.length === 0) return { score: 50, reasons: [] };

  const reasons: string[] = [];
  let score = 50;

  const labMap = new Map(labs.map((l) => [l.marker.toLowerCase(), l]));

  // Low testosterone → hormone optimization stacks
  const testo = labMap.get("testosterone_total");
  if (testo && testo.refRangeLow != null && testo.value < testo.refRangeLow) {
    if (stack.goal === "HORMONE_OPTIMIZATION" || stack.goal === "LIBIDO") {
      score += 25;
      reasons.push("Your testosterone is below reference range");
    }
  }

  // High inflammation markers → longevity/recovery
  const crp = labMap.get("crp") ?? labMap.get("hs_crp");
  if (crp && crp.refRangeHigh != null && crp.value > crp.refRangeHigh) {
    if (stack.goal === "LONGEVITY" || stack.goal === "RECOVERY" || stack.goal === "JOINT_HEALTH") {
      score += 20;
      reasons.push("Elevated inflammation markers suggest recovery focus");
    }
  }

  // Thyroid — low TSH or high TSH
  const tsh = labMap.get("tsh");
  if (tsh && tsh.refRangeHigh != null && tsh.value > tsh.refRangeHigh) {
    if (stack.goal === "METABOLIC_HEALTH" || stack.goal === "GENERAL_HEALTH") {
      score += 15;
      reasons.push("TSH above range — metabolic support may help");
    }
  }

  // Vitamin D deficiency
  const vitd = labMap.get("vitamin_d") ?? labMap.get("25_oh_vitamin_d");
  if (vitd && vitd.value < 30) {
    if (stack.goal === "GENERAL_HEALTH" || stack.goal === "LONGEVITY") {
      score += 10;
      reasons.push("Low vitamin D — general health stacks often include D3");
    }
  }

  return { score: Math.min(100, score), reasons };
}

// ─── Main Engine ─────────────────────────────────────

const WEIGHTS = {
  goalFit: 0.30,
  evidenceFit: 0.25,
  safetyFit: 0.20,
  phenotypeFit: 0.15,
  labFit: 0.10,
};

export function scoreStacks(
  stacks: StackCandidate[],
  phenotype: UserPhenotype,
  labs: LabSnapshot[]
): ScoredStack[] {
  return stacks
    .map((stack) => {
      const goalFit = scoreGoalFit(stack, phenotype);
      const evidenceFit = scoreEvidence(stack);
      const { score: safetyFit, warnings } = scoreSafety(stack, phenotype);
      const { score: phenotypeFit, reasons: phenoReasons } = scorePhenotypeFit(stack, phenotype);
      const { score: labFit, reasons: labReasons } = scoreLabFit(stack, labs);

      const totalScore =
        goalFit * WEIGHTS.goalFit +
        evidenceFit * WEIGHTS.evidenceFit +
        safetyFit * WEIGHTS.safetyFit +
        phenotypeFit * WEIGHTS.phenotypeFit +
        labFit * WEIGHTS.labFit;

      const reasons = [...phenoReasons, ...labReasons];
      if (goalFit === 100) reasons.unshift("Strong goal alignment");

      return {
        stack,
        totalScore: Math.round(totalScore * 10) / 10,
        goalFit,
        evidenceFit: Math.round(evidenceFit * 10) / 10,
        safetyFit,
        phenotypeFit,
        labFit,
        reasons,
        warnings,
      };
    })
    .sort((a, b) => b.totalScore - a.totalScore);
}
