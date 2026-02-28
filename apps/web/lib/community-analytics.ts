import { getStaleThresholdDays } from "./compound-freshness";

export type CommunitySignalEvent = {
  compounds: string[];
  goalContext: string;
  mentionedAt: Date | string;
  confidence?: number; // 0..1, defaults to 1
};

export type ConfidenceLabel = "low" | "medium" | "high";
export type TrendDirection = "up" | "down" | "stable";
export type NootropicGoalSlice = "focus" | "memory" | "sleep" | "mood" | "productivity" | "other";
export type NootropicCategoryView = "cognitive" | "recovery" | "wellbeing" | "performance" | "other";

export type PrevalenceRow = {
  goalContext: string;
  goalLabel: string;
  goalSlice: NootropicGoalSlice;
  categoryView: NootropicCategoryView;
  compoundSlug: string;
  mentions: number;
  weightedMentions: number;
  prevalenceScore: number; // 0-100 within goalContext
  confidence: ConfidenceLabel;
  lastMentionedAt: string | null;
  isStale: boolean;
};

export type CooccurrenceRow = {
  a: string;
  b: string;
  coMentions: number;
  weightedCoMentions: number;
  lift: number;
  confidence: ConfidenceLabel;
  lastMentionedAt: string | null;
  isStale: boolean;
};

export type TrendRow = {
  compoundSlug: string;
  previousWindowMentions: number;
  recentWindowMentions: number;
  velocity: number;
  direction: TrendDirection;
  confidence: ConfidenceLabel;
  lastMentionedAt: string | null;
  isStale: boolean;
};

export type CommunityAnalyticsResult = {
  prevalenceByGoal: PrevalenceRow[];
  cooccurrence: CooccurrenceRow[];
  trends: TrendRow[];
  nootropicTrendSlices: Record<NootropicGoalSlice, TrendRow[]>;
};

type ParsedEvent = {
  compounds: string[];
  goalContext: string;
  mentionedAt: Date;
  confidence: number;
  goalSlice: NootropicGoalSlice;
  categoryView: NootropicCategoryView;
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

function normalizeLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, " ");
}

function asGoalLabel(goalContext: string): string {
  return normalizeLabel(goalContext)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function clampConfidence(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 1;
  return Math.max(0.1, Math.min(1, value));
}

export function confidenceLabel(mentions: number): ConfidenceLabel {
  if (mentions >= 8) return "high";
  if (mentions >= 3) return "medium";
  return "low";
}

function inferGoalSlice(goalContext: string): NootropicGoalSlice {
  const goal = normalizeLabel(goalContext);
  if (/focus|attention|concentration|adhd|clarity/.test(goal)) return "focus";
  if (/memory|recall|learning|retention/.test(goal)) return "memory";
  if (/sleep|insomnia|circadian|rest/.test(goal)) return "sleep";
  if (/mood|anxiety|stress|calm|depression/.test(goal)) return "mood";
  if (/productivity|motivation|workflow|energy|fatigue/.test(goal)) return "productivity";
  return "other";
}

function categoryForSlice(slice: NootropicGoalSlice): NootropicCategoryView {
  switch (slice) {
    case "focus":
    case "memory":
      return "cognitive";
    case "sleep":
      return "recovery";
    case "mood":
      return "wellbeing";
    case "productivity":
      return "performance";
    default:
      return "other";
  }
}

function isStaleAt(date: Date | null, thresholdDays: number): boolean {
  if (!date) return true;
  const ageMs = Date.now() - date.getTime();
  return ageMs > thresholdDays * 24 * 60 * 60 * 1000;
}

function toIsoOrNull(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}

function parseEvents(events: CommunitySignalEvent[]): ParsedEvent[] {
  const parsed: ParsedEvent[] = [];
  for (const event of events) {
    const compounds = normalizeCompounds(event.compounds);
    const goalContext = normalizeLabel(event.goalContext);
    const mentionedAt = asDate(event.mentionedAt);
    if (!compounds.length || !goalContext || Number.isNaN(mentionedAt.getTime())) continue;

    const goalSlice = inferGoalSlice(goalContext);
    parsed.push({
      compounds,
      goalContext,
      mentionedAt,
      confidence: clampConfidence(event.confidence),
      goalSlice,
      categoryView: categoryForSlice(goalSlice),
    });
  }

  return parsed;
}

export function computePrevalenceByGoal(
  events: CommunitySignalEvent[],
  opts?: { staleThresholdDays?: number }
): PrevalenceRow[] {
  const parsedEvents = parseEvents(events);
  const staleThresholdDays = opts?.staleThresholdDays ?? getStaleThresholdDays();

  const byGoalCompound = new Map<
    string,
    {
      mentions: number;
      weightedMentions: number;
      goalSlice: NootropicGoalSlice;
      categoryView: NootropicCategoryView;
      lastMentionedAt: Date | null;
    }
  >();
  const goalTotals = new Map<string, number>();

  for (const event of parsedEvents) {
    for (const compound of event.compounds) {
      const key = `${event.goalContext}::${compound}`;
      const current = byGoalCompound.get(key) ?? {
        mentions: 0,
        weightedMentions: 0,
        goalSlice: event.goalSlice,
        categoryView: event.categoryView,
        lastMentionedAt: null,
      };
      current.mentions += 1;
      current.weightedMentions += event.confidence;
      if (!current.lastMentionedAt || event.mentionedAt > current.lastMentionedAt) {
        current.lastMentionedAt = event.mentionedAt;
      }
      byGoalCompound.set(key, current);

      goalTotals.set(event.goalContext, (goalTotals.get(event.goalContext) ?? 0) + event.confidence);
    }
  }

  return Array.from(byGoalCompound.entries())
    .map(([key, value]) => {
      const [goalContext, compoundSlug] = key.split("::");
      const total = goalTotals.get(goalContext) ?? 1;
      const prevalenceScore = (value.weightedMentions / total) * 100;
      return {
        goalContext,
        goalLabel: asGoalLabel(goalContext),
        goalSlice: value.goalSlice,
        categoryView: value.categoryView,
        compoundSlug,
        mentions: value.mentions,
        weightedMentions: Number(value.weightedMentions.toFixed(3)),
        prevalenceScore: Number(prevalenceScore.toFixed(2)),
        confidence: confidenceLabel(value.mentions),
        lastMentionedAt: toIsoOrNull(value.lastMentionedAt),
        isStale: isStaleAt(value.lastMentionedAt, staleThresholdDays),
      };
    })
    .sort((a, b) => b.prevalenceScore - a.prevalenceScore || a.compoundSlug.localeCompare(b.compoundSlug));
}

export function computeCooccurrenceMatrix(
  events: CommunitySignalEvent[],
  opts?: { staleThresholdDays?: number }
): CooccurrenceRow[] {
  const parsedEvents = parseEvents(events);
  const staleThresholdDays = opts?.staleThresholdDays ?? getStaleThresholdDays();

  const pairCounts = new Map<
    string,
    {
      coMentions: number;
      weightedCoMentions: number;
      lastMentionedAt: Date | null;
    }
  >();
  const compoundMentions = new Map<string, number>();
  let totalPosts = 0;

  for (const event of parsedEvents) {
    totalPosts += 1;

    for (const c of event.compounds) {
      compoundMentions.set(c, (compoundMentions.get(c) ?? 0) + 1);
    }

    for (let i = 0; i < event.compounds.length; i += 1) {
      for (let j = i + 1; j < event.compounds.length; j += 1) {
        const a = event.compounds[i]!;
        const b = event.compounds[j]!;
        const key = `${a}::${b}`;
        const row = pairCounts.get(key) ?? {
          coMentions: 0,
          weightedCoMentions: 0,
          lastMentionedAt: null,
        };
        row.coMentions += 1;
        row.weightedCoMentions += event.confidence;
        if (!row.lastMentionedAt || event.mentionedAt > row.lastMentionedAt) {
          row.lastMentionedAt = event.mentionedAt;
        }
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
        lastMentionedAt: toIsoOrNull(value.lastMentionedAt),
        isStale: isStaleAt(value.lastMentionedAt, staleThresholdDays),
      };
    })
    .sort((x, y) => y.weightedCoMentions - x.weightedCoMentions || y.lift - x.lift);
}

export function computeTrendVelocity(
  events: CommunitySignalEvent[],
  opts?: { now?: Date; windowDays?: number; staleThresholdDays?: number }
): TrendRow[] {
  const parsedEvents = parseEvents(events);
  const windowDays = opts?.windowDays ?? 30;
  const now = opts?.now ?? new Date();
  const staleThresholdDays = opts?.staleThresholdDays ?? getStaleThresholdDays();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const recentStart = new Date(now.getTime() - windowMs);
  const previousStart = new Date(now.getTime() - 2 * windowMs);

  const previous = new Map<string, number>();
  const recent = new Map<string, number>();
  const lastMentionedAt = new Map<string, Date>();

  for (const event of parsedEvents) {
    const t = event.mentionedAt.getTime();

    for (const c of event.compounds) {
      const currentLast = lastMentionedAt.get(c);
      if (!currentLast || event.mentionedAt > currentLast) lastMentionedAt.set(c, event.mentionedAt);

      if (t >= recentStart.getTime() && t <= now.getTime()) {
        recent.set(c, (recent.get(c) ?? 0) + 1);
      } else if (t >= previousStart.getTime() && t < recentStart.getTime()) {
        previous.set(c, (previous.get(c) ?? 0) + 1);
      }
    }
  }

  const compounds = new Set<string>([...Array.from(recent.keys()), ...Array.from(previous.keys())]);
  return Array.from(compounds)
    .map((compoundSlug) => {
      const recentWindowMentions = recent.get(compoundSlug) ?? 0;
      const previousWindowMentions = previous.get(compoundSlug) ?? 0;
      const velocity = (recentWindowMentions - previousWindowMentions) / Math.max(previousWindowMentions, 1);

      let direction: TrendDirection = "stable";
      if (velocity >= 0.25) direction = "up";
      else if (velocity <= -0.25) direction = "down";

      const latest = lastMentionedAt.get(compoundSlug) ?? null;
      return {
        compoundSlug,
        previousWindowMentions,
        recentWindowMentions,
        velocity: Number(velocity.toFixed(3)),
        direction,
        confidence: confidenceLabel(previousWindowMentions + recentWindowMentions),
        lastMentionedAt: toIsoOrNull(latest),
        isStale: isStaleAt(latest, staleThresholdDays),
      };
    })
    .sort((a, b) => Math.abs(b.velocity) - Math.abs(a.velocity));
}

export function computeNootropicTrendSlices(
  events: CommunitySignalEvent[],
  opts?: { now?: Date; windowDays?: number; staleThresholdDays?: number }
): Record<NootropicGoalSlice, TrendRow[]> {
  const parsedEvents = parseEvents(events);
  const slices: NootropicGoalSlice[] = ["focus", "memory", "sleep", "mood", "productivity", "other"];

  return slices.reduce(
    (acc, slice) => {
      const sliceEvents = parsedEvents
        .filter((event) => event.goalSlice === slice)
        .map<CommunitySignalEvent>((event) => ({
          compounds: event.compounds,
          goalContext: event.goalContext,
          mentionedAt: event.mentionedAt,
          confidence: event.confidence,
        }));
      acc[slice] = computeTrendVelocity(sliceEvents, opts);
      return acc;
    },
    {
      focus: [],
      memory: [],
      sleep: [],
      mood: [],
      productivity: [],
      other: [],
    } as Record<NootropicGoalSlice, TrendRow[]>
  );
}

export function scoreCommunityAnalytics(
  events: CommunitySignalEvent[],
  opts?: { now?: Date; windowDays?: number; staleThresholdDays?: number }
): CommunityAnalyticsResult {
  return {
    prevalenceByGoal: computePrevalenceByGoal(events, opts),
    cooccurrence: computeCooccurrenceMatrix(events, opts),
    trends: computeTrendVelocity(events, opts),
    nootropicTrendSlices: computeNootropicTrendSlices(events, opts),
  };
}
