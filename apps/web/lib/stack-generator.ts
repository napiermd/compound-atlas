/**
 * CompoundAtlas Stack Generation Engine
 *
 * Pure programmatic logic — no AI API. Generates evidence-based stacks
 * by fetching compounds from the DB and applying goal-specific selection
 * rules, legal/experience filters, and interaction safety checks.
 */
import type { PrismaClient, CompoundCategory, LegalStatus, StackGoal } from "@prisma/client";

// ─── PUBLIC TYPES ──────────────────────────────────

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export interface GeneratorInput {
  goal: StackGoal;
  experience: ExperienceLevel;
  constraints: string[];   // "no-gray-market" | "no-prescription" | "no-sarms" | "beginner-safe"
  maxCompounds: number;    // Typically 5-8
  selectionOffset?: number; // Optional deterministic diversity offset for seeded variants
}

export interface GeneratedCompound {
  compoundId: string;
  slug: string;
  name: string;
  dose?: number;
  unit?: string;
  frequency?: string;
  startWeek?: number;
  reasoning: string;
}

export interface GeneratedStack {
  name: string;
  description: string;
  goal: StackGoal;
  durationWeeks: number;
  compounds: GeneratedCompound[];
  interactionWarnings: string[];
  compositeScore: number;
  warnings: string[];
}

// ─── INTERNAL TYPES ────────────────────────────────

// The shape of compound data we query from DB
type CompoundRow = {
  id: string;
  slug: string;
  name: string;
  category: CompoundCategory;
  legalStatus: LegalStatus;
  evidenceScore: number | null;
  safetyScore: number | null;
  mechanismShort: string | null;
  doseTypical: number | null;
  doseMin: number | null;
  doseMax: number | null;
  doseUnit: string | null;
  doseFrequency: string | null;
  mechanisms: { pathway: string; description: string | null }[];
  interactions: {
    targetCompoundId: string;
    interactionType: string;
    severity: string | null;
    description: string | null;
    target: { slug: string; name: string };
  }[];
  sideEffects: { name: string; severity: string | null }[];
};

// Defines one "role" in a stack — a specific compound need
interface Slot {
  role: string;
  categories: CompoundCategory[];
  mechanismKeywords?: string[];   // Boost compounds matching these keywords
  count: number | [number, number, number]; // fixed or [beginner, intermediate, advanced]
  minExperience?: ExperienceLevel;
  reasoning: string; // Brief reasoning template
}

// ─── CONSTANTS ─────────────────────────────────────

const EXPERIENCE_ORDER: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

// Legal statuses allowed per experience level
const LEGAL_BY_EXPERIENCE: Record<ExperienceLevel, LegalStatus[]> = {
  beginner:     ["LEGAL"],
  intermediate: ["LEGAL", "PRESCRIPTION", "GRAY_MARKET", "RESEARCH_ONLY"],
  advanced:     ["LEGAL", "PRESCRIPTION", "GRAY_MARKET", "RESEARCH_ONLY", "SCHEDULED"],
};

// Safe categories for beginners / "beginner-safe" constraint
const BEGINNER_SAFE_CATEGORIES: CompoundCategory[] = [
  "SUPPLEMENT",
  "VITAMIN_MINERAL",
  "AMINO_ACID",
  "ADAPTOGEN",
  "NOOTROPIC",
];

const BUDGET_FRIENDLY_CATEGORIES: CompoundCategory[] = [
  "SUPPLEMENT",
  "VITAMIN_MINERAL",
  "AMINO_ACID",
  "ADAPTOGEN",
  "NOOTROPIC",
  "FAT_LOSS",
];

/** Goals that fundamentally require anabolic/hormonal compounds at intermediate+ levels */
export const ANABOLIC_DEPENDENT_GOALS: Set<StackGoal> = new Set([
  "BULK", "CUT", "RECOMP", "LIBIDO", "HORMONE_OPTIMIZATION",
] as StackGoal[]);

const EVIDENCE_FLOOR: Record<ExperienceLevel, number> = {
  beginner: 45,
  intermediate: 35,
  advanced: 25,
};

const SAFETY_FLOOR: Record<ExperienceLevel, number> = {
  beginner: 65,
  intermediate: 55,
  advanced: 45,
};

// ─── GOAL SLOT DEFINITIONS ─────────────────────────

const GOAL_SLOTS: Record<string, { slots: Slot[]; durationWeeks: number }> = {
  RECOMP: {
    durationWeeks: 12,
    slots: [
      {
        role: "anabolic_base",
        categories: ["ANABOLIC", "SARM", "HORMONAL"],
        mechanismKeywords: ["androgen", "anabolic", "lean mass", "testosterone", "AR agonist", "myotropic"],
        count: [0, 1, 2],
        minExperience: "intermediate",
        reasoning: "Anabolic base for simultaneous lean mass gain and fat loss",
      },
      {
        role: "fat_loss",
        categories: ["FAT_LOSS"],
        mechanismKeywords: ["lipolysis", "GLP-1", "appetite", "thermogenic", "AMPK", "fat oxidation"],
        count: 1,
        reasoning: "Fat loss agent targeting adipose reduction while preserving muscle",
      },
      {
        role: "gh_support",
        categories: ["GH_SECRETAGOGUE"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "GH secretagogue for body composition improvement and recovery",
      },
      {
        role: "performance",
        categories: ["SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["ATP", "phosphocreatine", "performance", "strength", "muscle", "pump", "ergogenic"],
        count: 2,
        reasoning: "Performance compound supporting training output and muscular adaptation",
      },
      {
        role: "health_support",
        categories: ["VITAMIN_MINERAL", "SUPPLEMENT"],
        mechanismKeywords: ["deficiency", "cardiovascular", "liver", "lipid", "omega-3", "testosterone cofactor"],
        count: 1,
        reasoning: "Foundational health compound supporting organ function during recomposition",
      },
      {
        role: "peptide_recovery",
        categories: ["PEPTIDE"],
        count: [0, 0, 1],
        minExperience: "advanced",
        reasoning: "Peptide compound enhancing tissue recovery and anabolic signaling",
      },
    ],
  },

  BULK: {
    durationWeeks: 16,
    slots: [
      {
        role: "primary_anabolic",
        categories: ["ANABOLIC", "HORMONAL"],
        mechanismKeywords: ["androgen", "anabolic", "testosterone", "AR agonist", "nitrogen retention"],
        count: [0, 1, 2],
        minExperience: "intermediate",
        reasoning: "Primary anabolic compound driving muscle protein synthesis and strength gains",
      },
      {
        role: "secondary_anabolic",
        categories: ["SARM"],
        mechanismKeywords: ["myotropic", "lean mass", "AR agonist"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Secondary anabolic for additional myotropic stimulus",
      },
      {
        role: "gh_axis",
        categories: ["GH_SECRETAGOGUE"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "GH secretagogue amplifying GH pulse and IGF-1 for maximal anabolism",
      },
      {
        role: "performance",
        categories: ["SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["ATP", "phosphocreatine", "pump", "endurance", "strength", "performance"],
        count: 3,
        reasoning: "Performance foundation for training volume and intensity",
      },
      {
        role: "recovery",
        categories: ["PEPTIDE", "SUPPLEMENT"],
        mechanismKeywords: ["repair", "recovery", "anti-inflammatory", "collagen", "VEGF"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Recovery support for sustained high-volume training",
      },
    ],
  },

  CUT: {
    durationWeeks: 12,
    slots: [
      {
        role: "muscle_preservation",
        categories: ["ANABOLIC", "SARM", "HORMONAL"],
        mechanismKeywords: ["androgen", "lean mass", "anti-catabolic", "muscle preservation"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Low-dose anabolic for muscle tissue preservation in caloric deficit",
      },
      {
        role: "primary_fat_loss",
        categories: ["FAT_LOSS"],
        mechanismKeywords: ["GLP-1", "appetite suppression", "lipolysis", "thermogenic", "insulin sensitivity"],
        count: 1,
        reasoning: "Primary fat loss agent driving appetite control and energy expenditure",
      },
      {
        role: "secondary_fat_loss",
        categories: ["FAT_LOSS", "SUPPLEMENT"],
        mechanismKeywords: ["AMPK", "insulin sensitivity", "glucose metabolism", "thermogenic", "berberine"],
        count: 1,
        reasoning: "Secondary metabolic agent supporting insulin sensitivity and fat oxidation",
      },
      {
        role: "muscle_foundation",
        categories: ["SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["muscle", "anti-catabolic", "ATP", "phosphocreatine"],
        count: 1,
        reasoning: "Foundational compound preserving muscle function during the cut",
      },
      {
        role: "stress_sleep",
        categories: ["ADAPTOGEN", "AMINO_ACID", "VITAMIN_MINERAL"],
        mechanismKeywords: ["cortisol", "HPA", "stress", "sleep", "GABA", "relaxation"],
        count: 1,
        reasoning: "Adaptogen/sleep compound counteracting caloric deficit stress and cortisol",
      },
      {
        role: "health_support",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["cardiovascular", "omega-3", "liver", "lipid", "deficiency"],
        count: 1,
        reasoning: "Foundational health support for cardiovascular and metabolic function",
      },
    ],
  },

  COGNITIVE: {
    durationWeeks: 8,
    slots: [
      {
        role: "cholinergic",
        categories: ["NOOTROPIC", "SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["acetylcholine", "choline", "cholinergic", "ACh", "memory", "hippocampus"],
        count: 1,
        reasoning: "Cholinergic compound enhancing acetylcholine availability for memory and focus",
      },
      {
        role: "neurotrophin",
        categories: ["NOOTROPIC", "SUPPLEMENT"],
        mechanismKeywords: ["NGF", "BDNF", "neuroplasticity", "nerve growth", "neuroprotection", "neurogenesis"],
        count: 1,
        reasoning: "Neurotrophin-boosting compound supporting long-term neuroplasticity and cognition",
      },
      {
        role: "focus_calm",
        categories: ["AMINO_ACID", "NOOTROPIC", "ADAPTOGEN"],
        mechanismKeywords: ["GABA", "alpha wave", "anxiety", "focus", "theanine", "calming"],
        count: 1,
        reasoning: "Anxiolytic focus compound for calm, sustained attention",
      },
      {
        role: "wakefulness",
        categories: ["NOOTROPIC"],
        mechanismKeywords: ["dopamine", "norepinephrine", "wakefulness", "orexin", "alertness", "stimulant"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Wakefulness agent for sustained alertness and executive function",
      },
      {
        role: "neuroprotection_energy",
        categories: ["NOOTROPIC", "SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["NAD+", "mitochondrial", "antioxidant", "neuroprotection", "brain energy", "BDNF"],
        count: 1,
        reasoning: "Neuroprotective compound supporting brain energy metabolism and cellular health",
      },
      {
        role: "brain_foundation",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["omega-3", "DHA", "EPA", "brain", "cognitive", "phospholipid", "deficiency"],
        count: 1,
        reasoning: "Foundational brain health compound addressing common cognitive-impairing deficiencies",
      },
    ],
  },

  SLEEP: {
    durationWeeks: 8,
    slots: [
      {
        role: "sleep_onset",
        categories: ["VITAMIN_MINERAL", "AMINO_ACID", "SUPPLEMENT"],
        mechanismKeywords: ["NMDA", "GABA", "sleep", "sedation", "melatonin", "relaxation", "adenosine"],
        count: 2,
        reasoning: "Primary sleep onset compound reducing CNS excitability and promoting sleep pressure",
      },
      {
        role: "cortisol_hpa",
        categories: ["ADAPTOGEN", "SUPPLEMENT"],
        mechanismKeywords: ["cortisol", "HPA", "stress", "adaptogen", "CRH", "ACTH", "withanolide"],
        count: 1,
        reasoning: "HPA axis modulator reducing evening cortisol for faster sleep initiation",
      },
      {
        role: "gh_deep_sleep",
        categories: ["GH_SECRETAGOGUE"],
        mechanismKeywords: ["slow wave sleep", "deep sleep", "GH pulse", "ghrelin", "sleep architecture"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "GH secretagogue amplifying slow-wave sleep and overnight recovery",
      },
      {
        role: "aminoacid_calming",
        categories: ["AMINO_ACID", "NOOTROPIC"],
        mechanismKeywords: ["GABA", "serotonin", "relaxation", "alpha wave", "calming"],
        count: 1,
        reasoning: "Calming amino acid supporting GABAergic relaxation and sleep transition",
      },
    ],
  },

  LONGEVITY: {
    durationWeeks: 52,
    slots: [
      {
        role: "nad_metabolism",
        categories: ["SUPPLEMENT", "NOOTROPIC", "VITAMIN_MINERAL"],
        mechanismKeywords: ["NAD+", "NMN", "NR", "sirtuin", "PARP", "DNA repair", "nicotinamide"],
        count: 1,
        reasoning: "NAD+ precursor restoring age-related decline in cellular energy metabolism and DNA repair",
      },
      {
        role: "mitochondrial",
        categories: ["SUPPLEMENT", "NOOTROPIC"],
        mechanismKeywords: ["mitochondrial", "CoQ10", "ubiquinol", "electron transport", "ATP synthase", "biogenesis"],
        count: 1,
        reasoning: "Mitochondrial support compound maintaining cellular energy production",
      },
      {
        role: "ampk_insulin",
        categories: ["SUPPLEMENT", "FAT_LOSS"],
        mechanismKeywords: ["AMPK", "insulin sensitivity", "glucose metabolism", "mTOR", "autophagy", "berberine", "metformin"],
        count: 1,
        reasoning: "AMPK activator improving metabolic health and promoting cellular cleanup",
      },
      {
        role: "inflammation_omega",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["omega-3", "EPA", "DHA", "anti-inflammatory", "COX", "prostaglandin", "cardiovascular"],
        count: 1,
        reasoning: "Anti-inflammatory omega-3 targeting chronic low-grade inflammation linked to aging",
      },
      {
        role: "antioxidant_repair",
        categories: ["SUPPLEMENT", "NOOTROPIC", "PEPTIDE"],
        mechanismKeywords: ["antioxidant", "glutathione", "Nrf2", "ROS", "oxidative stress", "NAC", "mitochondria"],
        count: 1,
        reasoning: "Antioxidant/repair compound reducing oxidative damage to proteins and DNA",
      },
      {
        role: "hormonal_vitality",
        categories: ["SUPPLEMENT", "ADAPTOGEN", "VITAMIN_MINERAL"],
        mechanismKeywords: ["testosterone", "deficiency", "bone density", "calcium", "immune", "hormonal"],
        count: 1,
        reasoning: "Foundational micronutrient addressing common age-related deficiencies",
      },
    ],
  },

  RECOVERY: {
    durationWeeks: 10,
    slots: [
      {
        role: "primary_peptide",
        categories: ["PEPTIDE"],
        mechanismKeywords: ["healing", "repair", "VEGF", "tendon", "ligament", "tissue", "FAK", "fibroblast"],
        count: 1,
        reasoning: "Primary healing peptide accelerating connective tissue and muscle repair",
      },
      {
        role: "systemic_peptide",
        categories: ["PEPTIDE"],
        mechanismKeywords: ["systemic", "GH", "IGF-1", "recovery", "anti-inflammatory", "actin", "thymosin"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Systemic recovery peptide supporting whole-body healing and adaptation",
      },
      {
        role: "gh_recovery",
        categories: ["GH_SECRETAGOGUE"],
        count: [0, 0, 1],
        minExperience: "advanced",
        reasoning: "GH secretagogue amplifying the anabolic overnight recovery window",
      },
      {
        role: "anti_inflammatory",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["omega-3", "anti-inflammatory", "COX", "EPA", "DHA", "prostaglandin"],
        count: 1,
        reasoning: "Anti-inflammatory compound reducing exercise-induced damage and swelling",
      },
      {
        role: "joint_bone",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["bone", "calcium", "collagen", "joint", "cartilage", "vitamin D", "deficiency"],
        count: 1,
        reasoning: "Joint and bone support for structural integrity during recovery",
      },
    ],
  },

  JOINT_HEALTH: {
    durationWeeks: 12,
    slots: [
      {
        role: "connective_tissue_peptide",
        categories: ["PEPTIDE"],
        mechanismKeywords: ["collagen", "tendon", "ligament", "joint", "cartilage", "VEGF", "healing"],
        count: [0, 1, 2],
        minExperience: "intermediate",
        reasoning: "Healing peptide directly supporting connective tissue repair and regeneration",
      },
      {
        role: "anti_inflammatory",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["omega-3", "anti-inflammatory", "COX", "prostaglandin", "EPA", "DHA"],
        count: 1,
        reasoning: "Anti-inflammatory compound reducing joint swelling and inflammatory damage",
      },
      {
        role: "bone_mineral",
        categories: ["VITAMIN_MINERAL"],
        mechanismKeywords: ["calcium", "vitamin D", "bone", "collagen", "mineral", "deficiency"],
        count: 1,
        reasoning: "Bone mineral support for joint and skeletal integrity",
      },
      {
        role: "foundation_supplement",
        categories: ["SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["collagen", "glycine", "proline", "connective tissue", "elastin"],
        count: 1,
        reasoning: "Foundational compound providing structural precursors for connective tissue synthesis",
      },
    ],
  },

  MOOD: {
    durationWeeks: 8,
    slots: [
      {
        role: "adaptogen",
        categories: ["ADAPTOGEN"],
        mechanismKeywords: ["cortisol", "HPA", "stress", "anxiety", "mood", "withanolide", "adaptogen"],
        count: 1,
        reasoning: "Adaptogen modulating stress response and cortisol for mood stabilization",
      },
      {
        role: "neurotrophin",
        categories: ["NOOTROPIC", "SUPPLEMENT"],
        mechanismKeywords: ["BDNF", "NGF", "neuroplasticity", "serotonin", "depression", "anxiety"],
        count: 1,
        reasoning: "Neurotrophin-boosting compound supporting mood regulation via BDNF pathways",
      },
      {
        role: "calming_focus",
        categories: ["AMINO_ACID", "NOOTROPIC"],
        mechanismKeywords: ["GABA", "serotonin", "dopamine", "mood", "alpha wave", "theanine"],
        count: 2,
        reasoning: "Calming amino acid supporting neurotransmitter balance for mood and focus",
      },
      {
        role: "deficiency_base",
        categories: ["VITAMIN_MINERAL", "SUPPLEMENT"],
        mechanismKeywords: ["serotonin cofactor", "melatonin", "deficiency", "mood", "magnesium", "omega-3"],
        count: 1,
        reasoning: "Foundational compound correcting common mood-impairing nutrient deficiencies",
      },
    ],
  },

  LIBIDO: {
    durationWeeks: 12,
    slots: [
      {
        role: "hormonal_base",
        categories: ["HORMONAL", "ANABOLIC"],
        mechanismKeywords: ["testosterone", "androgen", "LH", "FSH", "HPTA", "libido"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Hormonal optimization compound supporting testosterone and sexual function",
      },
      {
        role: "testosterone_support",
        categories: ["SUPPLEMENT", "ADAPTOGEN"],
        mechanismKeywords: ["testosterone", "LH", "HPTA", "eurycoma", "libido", "androgen"],
        count: 1,
        reasoning: "Natural testosterone and libido support compound",
      },
      {
        role: "nitric_oxide",
        categories: ["SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["nitric oxide", "NO", "vasodilation", "citrulline", "arginine", "blood flow", "pump"],
        count: 1,
        reasoning: "Nitric oxide precursor supporting vascular function and sexual performance",
      },
      {
        role: "receptor_agonist",
        categories: ["PEPTIDE"],
        mechanismKeywords: ["melanocortin", "MC4R", "sexual", "libido", "central"],
        count: [0, 1, 1],
        minExperience: "intermediate",
        reasoning: "Peptide receptor agonist for direct central nervous system sexual signaling",
      },
    ],
  },

  GENERAL_HEALTH: {
    durationWeeks: 52,
    slots: [
      {
        role: "omega3",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["omega-3", "EPA", "DHA", "cardiovascular", "anti-inflammatory"],
        count: 1,
        reasoning: "Omega-3 fatty acids for foundational cardiovascular and anti-inflammatory support",
      },
      {
        role: "vitamin_mineral",
        categories: ["VITAMIN_MINERAL"],
        mechanismKeywords: ["deficiency", "immune", "bone", "vitamin D", "calcium", "vitamin"],
        count: 2,
        reasoning: "Essential vitamin/mineral addressing widespread deficiencies affecting overall health",
      },
      {
        role: "adaptogen_stress",
        categories: ["ADAPTOGEN"],
        count: 1,
        reasoning: "Adaptogen for daily stress resilience and HPA axis regulation",
      },
      {
        role: "mitochondrial",
        categories: ["SUPPLEMENT"],
        mechanismKeywords: ["mitochondrial", "NAD+", "CoQ10", "energy", "antioxidant", "cellular"],
        count: 1,
        reasoning: "Mitochondrial support compound for sustained energy and cellular health",
      },
    ],
  },

  CUSTOM: {
    durationWeeks: 8,
    slots: [
      {
        role: "highest_evidence",
        categories: ["SUPPLEMENT", "NOOTROPIC", "AMINO_ACID", "VITAMIN_MINERAL", "ADAPTOGEN"],
        count: 6,
        reasoning: "Top evidence compound selected for general health and performance",
      },
    ],
  },

  ATHLETIC_PERFORMANCE: {
    durationWeeks: 8,
    slots: [
      {
        role: "primary_endurance",
        categories: ["SUPPLEMENT", "AMINO_ACID"],
        mechanismKeywords: ["endurance", "VO2", "aerobic", "oxygen", "fatigue", "lactic acid", "beta-alanine", "citrulline", "nitric oxide"],
        count: [1, 2, 2],
        reasoning: "Primary endurance compound targeting aerobic capacity and fatigue resistance",
      },
      {
        role: "power_base",
        categories: ["SUPPLEMENT", "AMINO_ACID", "FAT_LOSS"],
        mechanismKeywords: ["power", "strength", "anaerobic", "phosphocreatine", "ATP", "muscle", "cardarine", "PPAR"],
        count: [1, 1, 2],
        reasoning: "Power and strength compound for peak output and anaerobic performance",
      },
      {
        role: "adaptogen_performance",
        categories: ["ADAPTOGEN"],
        mechanismKeywords: ["adaptogen", "VO2 max", "cortisol", "endurance", "exercise", "stamina", "cordyceps", "rhodiola"],
        count: 1,
        reasoning: "Performance adaptogen targeting exercise capacity and recovery from training stress",
      },
      {
        role: "foundation",
        categories: ["VITAMIN_MINERAL", "SUPPLEMENT"],
        mechanismKeywords: ["electrolyte", "magnesium", "zinc", "vitamin", "recovery", "baseline", "creatine"],
        count: [1, 1, 2],
        reasoning: "Foundation micronutrient support for athletic baseline and recovery",
      },
    ],
  },

  HORMONE_OPTIMIZATION: {
    durationWeeks: 12,
    slots: [
      {
        role: "hormonal_axis",
        categories: ["HORMONAL"],
        mechanismKeywords: ["testosterone", "estrogen", "LH", "FSH", "HPTA", "aromatase", "enclomiphene", "anastrozole", "clomid", "SERM"],
        count: [0, 1, 2],
        reasoning: "Hormonal axis modulator supporting endogenous testosterone production and estrogen management",
      },
      {
        role: "testosterone_support",
        categories: ["SUPPLEMENT", "ADAPTOGEN"],
        mechanismKeywords: ["testosterone", "libido", "androgen", "LH", "tongkat", "ashwagandha", "hormone", "boron"],
        count: [1, 1, 2],
        reasoning: "Natural testosterone support compound via LH signaling or androgen biosynthesis",
      },
      {
        role: "mineral_base",
        categories: ["VITAMIN_MINERAL", "SUPPLEMENT"],
        mechanismKeywords: ["zinc", "magnesium", "boron", "testosterone", "mineral", "deficiency", "hormone"],
        count: [2, 2, 2],
        reasoning: "Core mineral support addressing common deficiencies that depress hormonal output",
      },
      {
        role: "vitamin_hormone",
        categories: ["VITAMIN_MINERAL"],
        mechanismKeywords: ["vitamin D", "vitamin-d3", "hormone", "steroid", "receptor", "testosterone", "calcium"],
        count: 1,
        reasoning: "Vitamin D3 for hormonal receptor sensitivity and steroidogenesis support",
      },
    ],
  },

  METABOLIC_HEALTH: {
    durationWeeks: 52,
    slots: [
      {
        role: "glycemic",
        categories: ["SUPPLEMENT"],
        mechanismKeywords: ["blood sugar", "glucose", "insulin", "AMPK", "berberine", "glycemic", "HbA1c", "metformin-like"],
        count: [1, 1, 2],
        reasoning: "Primary glycemic regulator targeting blood glucose and insulin sensitivity",
      },
      {
        role: "lipid_cardio",
        categories: ["SUPPLEMENT", "VITAMIN_MINERAL"],
        mechanismKeywords: ["cholesterol", "LDL", "HDL", "triglyceride", "cardiovascular", "omega-3", "lipid", "statin"],
        count: [1, 1, 1],
        reasoning: "Lipid and cardiovascular support compound targeting cholesterol and arterial health",
      },
      {
        role: "mitochondrial_metabolic",
        categories: ["SUPPLEMENT"],
        mechanismKeywords: ["mitochondria", "CoQ10", "NAD+", "energy", "metabolism", "cellular", "antioxidant", "ubiquinol"],
        count: 1,
        reasoning: "Mitochondrial support for metabolic efficiency and cellular energy production",
      },
      {
        role: "adaptogen_insulin",
        categories: ["ADAPTOGEN", "SUPPLEMENT"],
        mechanismKeywords: ["cortisol", "stress", "insulin resistance", "adaptogen", "glucose", "ashwagandha", "berberine", "HPA axis"],
        count: [0, 1, 1],
        reasoning: "Stress-cortisol modulator to reduce HPA-driven insulin resistance",
      },
      {
        role: "micronutrient",
        categories: ["VITAMIN_MINERAL"],
        mechanismKeywords: ["magnesium", "chromium", "zinc", "vitamin D", "insulin", "metabolism", "deficiency"],
        count: [2, 2, 2],
        reasoning: "Metabolic micronutrients addressing deficiencies common in insulin-resistant states",
      },
    ],
  },
};

// ─── HELPER FUNCTIONS ──────────────────────────────

function expIndex(exp: ExperienceLevel): number {
  return EXPERIENCE_ORDER.indexOf(exp);
}

function normalizeConstraint(raw: string): string {
  return raw.trim().toLowerCase().replace(/_/g, "-");
}

function hasConstraint(constraints: Set<string>, name: string): boolean {
  return constraints.has(name) || constraints.has(name.replace(/-/g, "_"));
}

function meetsMinExperience(minExp: ExperienceLevel | undefined, exp: ExperienceLevel): boolean {
  if (!minExp) return true;
  return expIndex(exp) >= expIndex(minExp);
}

function resolveCount(count: number | [number, number, number], exp: ExperienceLevel): number {
  if (typeof count === "number") return count;
  return count[expIndex(exp)];
}

/** Score a compound for keyword relevance (0 = no match, higher = more matches) */
function keywordRelevance(c: CompoundRow, keywords: string[]): number {
  if (!keywords.length) return 0;
  const text = [
    c.mechanismShort ?? "",
    ...c.mechanisms.map((m) => `${m.pathway} ${m.description ?? ""}`),
  ]
    .join(" ")
    .toLowerCase();
  return keywords.reduce((score, kw) => score + (text.includes(kw.toLowerCase()) ? 1 : 0), 0);
}

function severeSideEffectCount(c: CompoundRow): number {
  return c.sideEffects.filter((fx) => {
    const sev = (fx.severity ?? "").toLowerCase();
    return sev.includes("severe") || sev.includes("high");
  }).length;
}

/** Sort compounds by relevance, evidence, and safety with risk/cost penalties. */
function sortedCandidates(
  compounds: CompoundRow[],
  keywords: string[] = [],
  options?: { budgetFriendly?: boolean }
): CompoundRow[] {
  return [...compounds].sort((a, b) => {
    const score = (c: CompoundRow): number => {
      const kw = keywordRelevance(c, keywords);
      const evidence = c.evidenceScore ?? 0;
      const safety = c.safetyScore ?? 50;
      const severeFx = severeSideEffectCount(c);
      const legalPenalty = c.legalStatus === "LEGAL" ? 0 : c.legalStatus === "PRESCRIPTION" ? 4 : 7;
      const budgetPenalty =
        options?.budgetFriendly && !BUDGET_FRIENDLY_CATEGORIES.includes(c.category)
          ? 15
          : 0;
      return kw * 18 + evidence * 1.1 + safety * 0.9 - severeFx * 20 - legalPenalty - budgetPenalty;
    };
    return score(b) - score(a);
  });
}

/** Pick the top N unique compounds from a category bucket */
function pickFromSlot(
  allCompounds: CompoundRow[],
  slot: Slot,
  experience: ExperienceLevel,
  exclude: Set<string>,
  options?: { budgetFriendly?: boolean; selectionOffset?: number }
): { compound: CompoundRow; reasoning: string }[] {
  const n = resolveCount(slot.count, experience);
  if (n === 0) return [];
  if (!meetsMinExperience(slot.minExperience, experience)) return [];

  const candidates = allCompounds.filter(
    (c) =>
      slot.categories.includes(c.category) &&
      !exclude.has(c.id)
  );

  const sorted = sortedCandidates(candidates, slot.mechanismKeywords ?? [], options);
  if (sorted.length === 0) return [];

  // Diversify within the top candidate pool so seeded variants/experience tiers
  // do not collapse to identical stacks.
  const poolSize = Math.min(sorted.length, Math.max(n + 1, 6));
  const startMax = Math.max(0, poolSize - n);
  const start =
    startMax > 0
      ? (options?.selectionOffset ?? 0) % (startMax + 1)
      : 0;

  const picked = sorted.slice(start, start + n);

  return picked.map((c) => ({ compound: c, reasoning: slot.reasoning }));
}

/** Build an interaction lookup: compoundId → Map<targetId, interaction> */
function buildInteractionMap(
  compounds: CompoundRow[]
): Map<string, Map<string, { type: string; description: string | null; targetName: string }>> {
  const map = new Map<string, Map<string, { type: string; description: string | null; targetName: string }>>();
  for (const c of compounds) {
    for (const ix of c.interactions) {
      if (!map.has(c.id)) map.set(c.id, new Map());
      map.get(c.id)!.set(ix.targetCompoundId, {
        type: ix.interactionType,
        description: ix.description,
        targetName: ix.target.name,
      });
    }
  }
  return map;
}

function getInteraction(
  ixMap: Map<string, Map<string, { type: string; description: string | null; targetName: string }>>,
  aId: string,
  bId: string
): { type: string; description: string | null; targetName: string } | undefined {
  return ixMap.get(aId)?.get(bId) ?? ixMap.get(bId)?.get(aId);
}

/** Remove contraindicated compounds and collect caution warnings */
function applyInteractionSafety(
  selected: { compound: CompoundRow; reasoning: string }[],
  ixMap: Map<string, Map<string, { type: string; description: string | null; targetName: string }>>
): {
  safe: { compound: CompoundRow; reasoning: string }[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const removed = new Set<string>();

  for (let i = 0; i < selected.length; i++) {
    for (let j = i + 1; j < selected.length; j++) {
      const a = selected[i].compound;
      const b = selected[j].compound;
      const ix = getInteraction(ixMap, a.id, b.id);
      if (!ix) continue;

      if (ix.type === "contraindicated") {
        // Remove the lower-evidence compound
        const removeB = (a.evidenceScore ?? 0) >= (b.evidenceScore ?? 0);
        const toRemove = removeB ? b : a;
        removed.add(toRemove.id);
        warnings.push(
          `${a.name} and ${b.name} are contraindicated — removed ${toRemove.name} from the stack.${ix.description ? ` ${ix.description}` : ""}`
        );
      } else if (ix.type === "caution") {
        const note = ix.description ? ` ${ix.description}` : "";
        warnings.push(`Caution: ${a.name} + ${b.name}.${note}`);
      }
    }
  }

  return {
    safe: selected.filter((s) => !removed.has(s.compound.id)),
    warnings,
  };
}

/** Compute composite evidence score weighted by how central each compound is to the goal */
function computeCompositeScore(
  selected: { compound: CompoundRow; reasoning: string }[],
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _goal: StackGoal
): number {
  if (!selected.length) return 0;
  const scored = selected.filter((s) => s.compound.evidenceScore !== null);
  if (!scored.length) return 0;
  const sum = scored.reduce((acc, s) => acc + (s.compound.evidenceScore ?? 0), 0);
  return Math.round((sum / scored.length) * 10) / 10;
}

function goalLabel(goal: StackGoal, experience: ExperienceLevel): string {
  const expLabel = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" }[experience];
  const goalLabel: Record<string, string> = {
    RECOMP: "Recomposition",
    BULK: "Bulk",
    CUT: "Cut",
    COGNITIVE: "Cognitive",
    SLEEP: "Sleep",
    LONGEVITY: "Longevity",
    RECOVERY: "Recovery",
    JOINT_HEALTH: "Joint Health",
    MOOD: "Mood",
    LIBIDO: "Libido",
    GENERAL_HEALTH: "General Health",
    CUSTOM: "General",
    ATHLETIC_PERFORMANCE: "Athletic Performance",
    HORMONE_OPTIMIZATION: "Hormone Optimization",
    METABOLIC_HEALTH: "Metabolic Health",
  };
  return `${expLabel} ${goalLabel[goal] ?? goal} Stack`;
}

function buildDescription(
  goal: StackGoal,
  experience: ExperienceLevel,
  selected: { compound: CompoundRow; reasoning: string }[],
  compositeScore: number,
  constraints: Set<string>
): string {
  const date = new Date().toISOString().split("T")[0];
  const names = selected.map((s) => s.compound.name).join(", ");
  let expDesc = {
    beginner: "Designed for beginners using legal, OTC compounds only.",
    intermediate: "Intermediate protocol including select prescription and research compounds.",
    advanced: "Advanced protocol for experienced users with access to the full compound spectrum.",
  }[experience];

  if (hasConstraint(constraints, "otc-only")) {
    expDesc = "Conservative OTC-only protocol prioritizing legal, higher-confidence compounds.";
  } else if (hasConstraint(constraints, "minimal-sides")) {
    expDesc = "Conservative protocol prioritizing compounds with lower side-effect flags.";
  } else if (hasConstraint(constraints, "high-evidence")) {
    expDesc = "Evidence-prioritized protocol focused on stronger-researched compounds for this goal.";
  }

  return (
    `Auto-generated based on evidence scores as of ${date}. ` +
    `Compounds selected by evidence ranking with interaction safety checks. ` +
    `${expDesc} ` +
    `Composite evidence score: ${compositeScore}/100. ` +
    `Included: ${names}.`
  );
}

/** Validate that a generated stack contains the expected compound types for its goal */
function validateStackForGoal(
  goal: StackGoal,
  experience: ExperienceLevel,
  selected: { compound: CompoundRow; reasoning: string }[]
): string[] {
  // Beginners are supplement-only by design — skip validation
  if (experience === "beginner") return [];

  const warnings: string[] = [];
  const categories = new Set(selected.map((s) => s.compound.category));

  if (goal === "BULK" || goal === "CUT" || goal === "RECOMP") {
    if (!categories.has("ANABOLIC") && !categories.has("HORMONAL")) {
      warnings.push(
        `${goal} stack for ${experience} has no ANABOLIC or HORMONAL compound — constraints may be too restrictive.`
      );
    }
  } else if (goal === "HORMONE_OPTIMIZATION") {
    if (!categories.has("HORMONAL")) {
      warnings.push(
        `HORMONE_OPTIMIZATION stack for ${experience} has no HORMONAL compound — constraints may be too restrictive.`
      );
    }
  } else if (goal === "LIBIDO") {
    if (!categories.has("HORMONAL") && !categories.has("ANABOLIC") && !categories.has("PEPTIDE")) {
      warnings.push(
        `LIBIDO stack for ${experience} has no HORMONAL, ANABOLIC, or PEPTIDE compound — constraints may be too restrictive.`
      );
    }
  }

  return warnings;
}

// ─── MAIN EXPORT ───────────────────────────────────

export async function generateStack(
  input: GeneratorInput,
  client: PrismaClient
): Promise<GeneratedStack> {
  const { goal, experience, constraints, maxCompounds, selectionOffset = 0 } = input;
  const constraintSet = new Set(constraints.map(normalizeConstraint));

  // 1. Fetch all compounds with relations
  const allCompounds = (await client.compound.findMany({
    include: {
      mechanisms: { select: { pathway: true, description: true } },
      interactions: {
        select: {
          targetCompoundId: true,
          interactionType: true,
          severity: true,
          description: true,
          target: { select: { slug: true, name: true } },
        },
      },
      sideEffects: { select: { name: true, severity: true } },
    },
    orderBy: { evidenceScore: { sort: "desc", nulls: "last" } },
  })) as CompoundRow[];

  // 2. Build legal filter from experience level
  let allowedLegal: LegalStatus[] = [...LEGAL_BY_EXPERIENCE[experience]];

  // 3. Apply constraint overrides
  if (hasConstraint(constraintSet, "otc-only")) {
    allowedLegal = ["LEGAL"];
  }
  if (hasConstraint(constraintSet, "no-gray-market")) {
    allowedLegal = allowedLegal.filter((l) => l !== "GRAY_MARKET");
  }
  if (hasConstraint(constraintSet, "no-prescription")) {
    allowedLegal = allowedLegal.filter((l) => l !== "PRESCRIPTION" && l !== "SCHEDULED");
  }

  let filtered = allCompounds.filter((c) => allowedLegal.includes(c.legalStatus as LegalStatus));

  // Additional category restrictions
  if (hasConstraint(constraintSet, "no-sarms")) {
    filtered = filtered.filter((c) => c.category !== "SARM");
  }
  if (hasConstraint(constraintSet, "beginner-safe")) {
    filtered = filtered.filter((c) =>
      BEGINNER_SAFE_CATEGORIES.includes(c.category) && c.legalStatus === "LEGAL"
    );
  }
  if (hasConstraint(constraintSet, "budget-friendly")) {
    filtered = filtered.filter((c) => BUDGET_FRIENDLY_CATEGORIES.includes(c.category));
  }
  if (hasConstraint(constraintSet, "high-evidence")) {
    filtered = filtered.filter((c) => (c.evidenceScore ?? 0) >= EVIDENCE_FLOOR[experience]);
  }
  if (hasConstraint(constraintSet, "minimal-sides")) {
    filtered = filtered.filter(
      (c) =>
        (c.safetyScore == null || c.safetyScore >= SAFETY_FLOOR[experience]) &&
        severeSideEffectCount(c) === 0
    );
  }
  // For beginners (no explicit constraint needed — already handled by allowedLegal),
  // also restrict to safe categories unless they explicitly passed advanced goals
  if (experience === "beginner" && !hasConstraint(constraintSet, "beginner-safe")) {
    filtered = filtered.filter((c) => BEGINNER_SAFE_CATEGORIES.includes(c.category));
  }

  // 4. Get goal slots
  const plan = GOAL_SLOTS[goal] ?? GOAL_SLOTS.CUSTOM;
  const slots = plan.slots;

  // 5. Build interaction map for the full compound set
  const ixMap = buildInteractionMap(allCompounds);

  // 6. Select compounds slot by slot, tracking excluded IDs
  const excluded = new Set<string>();
  const rawSelected: { compound: CompoundRow; reasoning: string }[] = [];
  const preferBudget = hasConstraint(constraintSet, "budget-friendly");
  let slotOffset = Math.max(0, selectionOffset);

  for (const slot of slots) {
    const picks = pickFromSlot(filtered, slot, experience, excluded, {
      budgetFriendly: preferBudget,
      selectionOffset: slotOffset,
    });
    for (const pick of picks) {
      rawSelected.push(pick);
      excluded.add(pick.compound.id);
      if (rawSelected.length >= maxCompounds) break;
    }
    slotOffset += 1;
    if (rawSelected.length >= maxCompounds) break;
  }

  // Backfill if slots did not find enough compounds after constraints/filtering.
  const minCompoundsTarget = Math.min(3, maxCompounds);
  if (rawSelected.length < minCompoundsTarget) {
    const fallback = sortedCandidates(filtered, [], { budgetFriendly: preferBudget });
    const fallbackWindow = Math.min(fallback.length, 6);
    const fallbackOffset =
      fallbackWindow > 0 ? selectionOffset % fallbackWindow : 0;
    const rotatedFallback = [
      ...fallback.slice(fallbackOffset),
      ...fallback.slice(0, fallbackOffset),
    ];
    for (const c of rotatedFallback) {
      if (excluded.has(c.id)) continue;
      rawSelected.push({
        compound: c,
        reasoning: "Evidence-backed fallback added to complete a viable stack.",
      });
      excluded.add(c.id);
      if (rawSelected.length >= minCompoundsTarget) break;
      if (rawSelected.length >= maxCompounds) break;
    }
  }

  // 7. Apply interaction safety checks
  const { safe, warnings: interactionWarnings } = applyInteractionSafety(rawSelected, ixMap);

  // 8. Collect synergy notes
  const synergies: string[] = [];
  for (let i = 0; i < safe.length; i++) {
    for (let j = i + 1; j < safe.length; j++) {
      const ix = getInteraction(ixMap, safe[i].compound.id, safe[j].compound.id);
      if (ix?.type === "synergistic") {
        synergies.push(`${safe[i].compound.name} + ${safe[j].compound.name} — synergistic combination.`);
      }
    }
  }

  // 9. Build output compounds
  const compounds: GeneratedCompound[] = safe.map((s) => ({
    compoundId: s.compound.id,
    slug: s.compound.slug,
    name: s.compound.name,
    dose: s.compound.doseTypical ?? s.compound.doseMin ?? undefined,
    unit: s.compound.doseUnit ?? undefined,
    frequency: s.compound.doseFrequency ?? undefined,
    startWeek: 1,
    reasoning: s.reasoning,
  }));

  const compositeScore = computeCompositeScore(safe, goal);
  const name = goalLabel(goal, experience);
  const description = buildDescription(
    goal,
    experience,
    safe,
    compositeScore,
    constraintSet
  );

  const warnings: string[] = [];
  if (experience !== "beginner" && safe.some((s) => s.compound.legalStatus === "GRAY_MARKET")) {
    warnings.push(
      "This stack contains gray-market research compounds. No human safety data from controlled trials exists. Use at your own risk."
    );
  }
  if (safe.some((s) => s.compound.legalStatus === "PRESCRIPTION")) {
    warnings.push("Some compounds require a prescription. Do not use without medical supervision.");
  }

  // Validate that anabolic-dependent goals have the expected compound types
  const goalWarnings = validateStackForGoal(goal, experience, safe);
  if (goalWarnings.length > 0) {
    warnings.push(...goalWarnings);
    for (const w of goalWarnings) {
      console.warn(`[stack-generator] ${w}`);
    }
  }

  return {
    name,
    description,
    goal,
    durationWeeks: plan.durationWeeks,
    compounds,
    interactionWarnings: [...interactionWarnings, ...synergies],
    compositeScore,
    warnings,
  };
}
