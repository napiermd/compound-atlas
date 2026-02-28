import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCooccurrenceMatrix,
  computePrevalenceByGoal,
  computeTrendVelocity,
  scoreCommunityAnalytics,
  type CommunitySignalEvent,
} from "./community-analytics";

const events: CommunitySignalEvent[] = [
  { compounds: ["creatine", "beta-alanine"], goalContext: "performance", mentionedAt: "2026-02-20T00:00:00.000Z" },
  { compounds: ["creatine"], goalContext: "performance", mentionedAt: "2026-02-18T00:00:00.000Z" },
  { compounds: ["ashwagandha"], goalContext: "stress", mentionedAt: "2026-02-17T00:00:00.000Z" },
  { compounds: ["ashwagandha", "magnesium"], goalContext: "sleep", mentionedAt: "2026-02-22T00:00:00.000Z", confidence: 0.8 },
  { compounds: ["creatine"], goalContext: "performance", mentionedAt: "2026-01-15T00:00:00.000Z" },
  { compounds: ["ashwagandha"], goalContext: "stress", mentionedAt: "2026-01-16T00:00:00.000Z" },
  { compounds: ["ashwagandha"], goalContext: "stress", mentionedAt: "2026-01-10T00:00:00.000Z" },
];

test("computePrevalenceByGoal calculates weighted prevalence per goal", () => {
  const rows = computePrevalenceByGoal(events);
  const perfCreatine = rows.find((r) => r.goalContext === "performance" && r.compoundSlug === "creatine");
  const perfBeta = rows.find((r) => r.goalContext === "performance" && r.compoundSlug === "beta-alanine");

  assert.ok(perfCreatine);
  assert.ok(perfBeta);
  assert.equal(perfCreatine.prevalenceScore, 75);
  assert.equal(perfBeta.prevalenceScore, 25);
  assert.equal(perfCreatine.confidence, "medium");
});

test("computeCooccurrenceMatrix calculates pair counts and lift", () => {
  const rows = computeCooccurrenceMatrix(events);
  const pair = rows.find((r) => r.a === "ashwagandha" && r.b === "magnesium");

  assert.ok(pair);
  assert.equal(pair.coMentions, 1);
  assert.equal(pair.confidence, "low");
  assert.ok(pair.lift > 1);
});

test("computeTrendVelocity marks up/down/stable directions", () => {
  const rows = computeTrendVelocity(events, {
    now: new Date("2026-02-28T00:00:00.000Z"),
    windowDays: 30,
  });

  const creatine = rows.find((r) => r.compoundSlug === "creatine");
  const ashwagandha = rows.find((r) => r.compoundSlug === "ashwagandha");

  assert.ok(creatine);
  assert.ok(ashwagandha);

  assert.equal(creatine.direction, "up");
  assert.equal(creatine.velocity, 1);

  assert.equal(ashwagandha.direction, "stable");
  assert.equal(ashwagandha.velocity, 0);
});

test("scoreCommunityAnalytics returns all analytics surfaces", () => {
  const result = scoreCommunityAnalytics(events, {
    now: new Date("2026-02-28T00:00:00.000Z"),
    windowDays: 30,
  });

  assert.ok(result.prevalenceByGoal.length > 0);
  assert.ok(result.cooccurrence.length > 0);
  assert.ok(result.trends.length > 0);
});
