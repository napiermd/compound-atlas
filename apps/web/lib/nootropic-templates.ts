import type { StackSummary } from "@/components/stack/types";

export type NootropicTemplateKey = "focus" | "memory" | "sleep";

export const NOOTROPIC_TEMPLATES: Record<
  NootropicTemplateKey,
  { label: string; keywords: string[]; goals: string[] }
> = {
  focus: {
    label: "Focus",
    keywords: ["focus", "attention", "adhd", "productivity", "energy"],
    goals: ["COGNITIVE", "ATHLETIC_PERFORMANCE"],
  },
  memory: {
    label: "Memory",
    keywords: ["memory", "recall", "learning", "neuro"],
    goals: ["COGNITIVE", "LONGEVITY"],
  },
  sleep: {
    label: "Sleep",
    keywords: ["sleep", "rest", "insomnia", "deep sleep", "recovery", "calm"],
    goals: ["SLEEP", "RECOVERY", "MOOD"],
  },
};

function haystack(stack: StackSummary): string {
  return [
    stack.name,
    stack.description ?? "",
    ...(stack.tags ?? []),
    ...(stack.riskFlags ?? []),
    ...stack.compounds.map((sc) => sc.compound.name),
  ]
    .join(" ")
    .toLowerCase();
}

export function isNootropicStack(stack: StackSummary): boolean {
  if (stack.category === "COGNITION") return true;
  return ["COGNITIVE", "SLEEP", "MOOD", "LONGEVITY"].includes(stack.goal);
}

export function matchesTemplate(stack: StackSummary, template: NootropicTemplateKey): boolean {
  const spec = NOOTROPIC_TEMPLATES[template];
  const text = haystack(stack);
  if (spec.goals.includes(stack.goal)) return true;
  return spec.keywords.some((k) => text.includes(k));
}
