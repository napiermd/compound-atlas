export type CommunitySignalEvent = {
  compounds: string[];
  goalContext: string;
  mentionedAt: Date | string;
  confidence?: number; // 0..1, defaults to 1
};

export type ConfidenceLabel = "low" | "medium" | "high";

export type PrevalenceRow = {
  goalContext: string;
  compoundSlug: string;
  mentions: number;
  weightedMentions: number;
  prevalenceScore: number; // 0..100 within goalContext
  confidence: ConfidenceLabel;
};

export type CooccurrenceRow = {
  a: string;
  b: string;
  coMentions: number;
  weightedCoMentions: number;
  lift: number;
  confidence: ConfidenceLabel;
};

export type TrendRow = {
  compoundSlug: string;
  previousWindowMentions: number;
  recentWindowMentions: number;
  velocity: number;
  direction: "up" | "down" | "stable";
  confidence: ConfidenceLabel;
};

export type CommunityAnalyticsResult = {
  prevalenceByGoal: PrevalenceRow[];
  cooccurrence: CooccurrenceRow[];
  trends: TrendRow[];
};

function asDate(input: Date | string): Date {
  return input instanceof Date ? input : new Date(input);
}

function normalizeCompounds(compounds: string[]): string[] {
  const deduped = new Set<string>();
  for (const c of compounds) {
    const slug = c.trim().toLowerCase();
    if (slug) deduped.add(slug);
  }
  return Array.from(deduped).sort();
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.max(0.1, Math.min(1, value));
}

function confidenceLabel(mentions: number): ConfidenceLabel {
  if (mentions >= 8) return "high";
  if (mentions >= 3) return "medium";
  return "low";
}

export function computePrevalenceByGoal(events: CommunitySignalEvent[]): PrevalenceRow[] {
  const byGoalCompound = new Map<string, { mentions: number; weightedMentions: number }>();
  const goalTotals = new Map<string, number>();

  for (const event of events) {
    const compounds = normalizeCompounds(event.compounds);
    if (compounds.length === 0 || !event.goalContext?.trim()) continue;

    const goal = event.goalContext.trim().toLowerCase();
    const w = clampConfidence(event.confidence);

    for (const compound of compounds) {
      const key = `${goal}::${compound}`;
      const current = byGoalCompound.get(key) ?? { mentions: 0, weightedMentions: 0 };
      current.mentions += 1;
      current.weightedMentions += w;
      byGoalCompound.set(key, current);

      goalTotals.set(goal, (goalTotals.get(goal) ?? 0) + w);
    }
  }

  return Array.from(byGoalCompound.entries())
    .map(([key, value]) => {
      const [goalContext, compoundSlug] = key.split("::");
      const total = goalTotals.get(goalContext) ?? 1;
      const prevalenceScore = (value.weightedMentions / total) * 100;
      return {
        goalContext,
        compoundSlug,
        mentions: value.mentions,
        weightedMentions: Number(value.weightedMentions.toFixed(3)),
        prevalenceScore: Number(prevalenceScore.toFixed(2)),
        confidence: confidenceLabel(value.mentions),
      };
    })
    .sort((a, b) => b.prevalenceScore - a.prevalenceScore || a.compoundSlug.localeCompare(b.compoundSlug));
}

export function computeCooccurrenceMatrix(events: CommunitySignalEvent[]): CooccurrenceRow[] {
  const pairCounts = new Map<string, { coMentions: number; weightedCoMentions: number }>();
  const compoundMentions = new Map<string, number>();
  let totalPosts = 0;

  for (const event of events) {
    const compounds = normalizeCompounds(event.compounds);
    if (compounds.length === 0) continue;

    totalPosts += 1;
    const w = clampConfidence(event.confidence);

    for (const c of compounds) {
      compoundMentions.set(c, (compoundMentions.get(c) ?? 0) + 1);
    }

    for (let i = 0; i < compounds.length; i += 1) {
      for (let j = i + 1; j < compounds.length; j += 1) {
        const a = compounds[i]!;
        const b = compounds[j]!;
        const key = `${a}::${b}`;
        const row = pairCounts.get(key) ?? { coMentions: 0, weightedCoMentions: 0 };
        row.coMentions += 1;
        row.weightedCoMentions += w;
        pairCounts.set(key, row);
      }
    }
  }

  return Array.from(pairCounts.entries())
    .map(([key, value]) => {
      const [a, b] = key.split("::");
      const pA = (compoundMentions.get(a) ?? 0) / Math.max(totalPosts, 1);
      const pB = (compoundMentions.get(b) ?? 0) / Math.max(totalPosts, 1);
      const pAB = value.coMentions / Math.max(totalPosts, 1);
      const expected = pA * pB;
      const lift = expected > 0 ? pAB / expected : 0;

      return {
        a,
        b,
        coMentions: value.coMentions,
        weightedCoMentions: Number(value.weightedCoMentions.toFixed(3)),
        lift: Number(lift.toFixed(3)),
        confidence: confidenceLabel(value.coMentions),
      };
    })
    .sort((x, y) => y.weightedCoMentions - x.weightedCoMentions || y.lift - x.lift);
}

export function computeTrendVelocity(
  events: CommunitySignalEvent[],
  opts?: { now?: Date; windowDays?: number }
): TrendRow[] {
  const windowDays = opts?.windowDays ?? 30;
  const now = opts?.now ?? new Date();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const recentStart = new Date(now.getTime() - windowMs);
  const previousStart = new Date(now.getTime() - 2 * windowMs);

  const previous = new Map<string, number>();
  const recent = new Map<string, number>();

  for (const event of events) {
    const compounds = normalizeCompounds(event.compounds);
    if (compounds.length === 0) continue;

    const t = asDate(event.mentionedAt).getTime();
    if (Number.isNaN(t)) continue;

    for (const c of compounds) {
      if (t >= recentStart.getTime() && t <= now.getTime()) {
        recent.set(c, (recent.get(c) ?? 0) + 1);
      } else if (t >= previousStart.getTime() && t < recentStart.getTime()) {
        previous.set(c, (previous.get(c) ?? 0) + 1);
      }
    }
  }

  const compounds = new Set<string>([
    ...Array.from(recent.keys()),
    ...Array.from(previous.keys()),
  ]);
  return Array.from(compounds)
    .map((compoundSlug) => {
      const recentWindowMentions = recent.get(compoundSlug) ?? 0;
      const previousWindowMentions = previous.get(compoundSlug) ?? 0;
      const velocity = (recentWindowMentions - previousWindowMentions) / Math.max(previousWindowMentions, 1);

      let direction: TrendRow["direction"] = "stable";
      if (velocity >= 0.25) direction = "up";
      else if (velocity <= -0.25) direction = "down";

      return {
        compoundSlug,
        previousWindowMentions,
        recentWindowMentions,
        velocity: Number(velocity.toFixed(3)),
        direction,
        confidence: confidenceLabel(previousWindowMentions + recentWindowMentions),
      };
    })
    .sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity));
}

export function scoreCommunityAnalytics(
  events: CommunitySignalEvent[],
  opts?: { now?: Date; windowDays?: number }
): CommunityAnalyticsResult {
  return {
    prevalenceByGoal: computePrevalenceByGoal(events),
    cooccurrence: computeCooccurrenceMatrix(events),
    trends: computeTrendVelocity(events, opts),
  };
}
