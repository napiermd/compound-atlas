import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCooccurrenceMatrix,
  computePrevalenceByGoal,
  computeTrendVelocity,
  scoreCommunityAnalytics,
  type CommunitySignalEvent,
} from "./community-analytics";

const now = new Date("2026-02-28T00:00:00.000Z");
const events: CommunitySignalEvent[] = [
  { compounds: ["alpha-gpc", "l-theanine"], goalContext: "focus", mentionedAt: "2026-02-20T00:00:00.000Z" },
  { compounds: ["alpha-gpc"], goalContext: "focus", mentionedAt: "2026-02-18T00:00:00.000Z" },
  { compounds: ["bacopa"], goalContext: "memory", mentionedAt: "2026-02-17T00:00:00.000Z" },
  { compounds: ["magnesium", "glycine"], goalContext: "sleep", mentionedAt: "2026-02-22T00:00:00.000Z", confidence: 0.8 },
  { compounds: ["rhodiola"], goalContext: "mood", mentionedAt: "2026-01-16T00:00:00.000Z" },
  { compounds: ["alpha-gpc"], goalContext: "productivity", mentionedAt: "2026-01-15T00:00:00.000Z" },
  { compounds: ["bacopa"], goalContext: "memory", mentionedAt: "2026-01-10T00:00:00.000Z" },
];

test("computePrevalenceByGoal calculates weighted prevalence and nootropic labels/views", () => {
  const rows = computePrevalenceByGoal(events, { staleThresholdDays: 20 });
  const focusAlpha = rows.find((r) => r.goalContext === "focus" && r.compoundSlug === "alpha-gpc");
  const focusTheanine = rows.find((r) => r.goalContext === "focus" && r.compoundSlug === "l-theanine");

  assert.ok(focusAlpha);
  assert.ok(focusTheanine);
  assert.equal(focusAlpha.prevalenceScore, 66.67);
  assert.equal(focusTheanine.prevalenceScore, 33.33);
  assert.equal(focusAlpha.confidence, "low");
  assert.equal(focusAlpha.goalLabel, "Focus");
  assert.equal(focusAlpha.goalSlice, "focus");
  assert.equal(focusAlpha.categoryView, "cognitive");
  assert.equal(focusAlpha.isStale, false);
});

test("computeCooccurrenceMatrix calculates pair counts, confidence, and stale marker", () => {
  const rows = computeCooccurrenceMatrix(events, { staleThresholdDays: 5 });
  const pair = rows.find(
    (r) => (r.a === "magnesium" && r.b === "glycine") || (r.a === "glycine" && r.b === "magnesium")
  );

  assert.ok(pair);
  assert.equal(pair.coMentions, 1);
  assert.equal(pair.confidence, "low");
  assert.ok(pair.lift > 1);
  assert.equal(pair.isStale, true);
});

test("computeTrendVelocity marks up/down/stable and uses same confidence/stale rules", () => {
  const rows = computeTrendVelocity(events, {
    now,
    windowDays: 30,
    staleThresholdDays: 20,
  });

  const alpha = rows.find((r) => r.compoundSlug === "alpha-gpc");
  const bacopa = rows.find((r) => r.compoundSlug === "bacopa");

  assert.ok(alpha);
  assert.ok(bacopa);

  assert.equal(alpha.direction, "up");
  assert.equal(alpha.velocity, 1);
  assert.equal(alpha.confidence, "medium");
  assert.equal(alpha.isStale, false);

  assert.equal(bacopa.direction, "stable");
  assert.equal(bacopa.velocity, 0);
  assert.equal(bacopa.confidence, "low");
});

test("scoreCommunityAnalytics returns nootropic trend slices", () => {
  const result = scoreCommunityAnalytics(events, {
    now,
    windowDays: 30,
    staleThresholdDays: 20,
  });

  assert.ok(result.prevalenceByGoal.length > 0);
  assert.ok(result.cooccurrence.length > 0);
  assert.ok(result.trends.length > 0);

  assert.ok(result.nootropicTrendSlices.focus.length > 0);
  assert.ok(result.nootropicTrendSlices.memory.length > 0);
  assert.ok(result.nootropicTrendSlices.sleep.length > 0);
  assert.ok(result.nootropicTrendSlices.mood.length > 0);
  assert.ok(result.nootropicTrendSlices.productivity.length > 0);
});
