import test from "node:test";
import assert from "node:assert/strict";
import type { StackSummary } from "../components/stack/types";
import { applyStackFilters, getCategoryCounts, getFolderCounts, getRiskCounts, getTagCounts } from "./stack-gallery";

const baseStacks: StackSummary[] = [
  {
    id: "1",
    slug: "focus-am",
    name: "Focus AM",
    description: "Workday stack",
    goal: "COGNITIVE",
    durationWeeks: 8,
    evidenceScore: 78,
    isPublic: true,
    category: "COGNITION",
    folder: "Morning",
    tags: ["focus", "workday"],
    riskFlags: ["sleep disruption risk"],
    orderIndex: 2,
    upvotes: 10,
    forkCount: 0,
    forkedFromId: null,
    createdAt: "2026-02-01T00:00:00.000Z",
    creator: { name: "A", image: null },
    compounds: [],
    _count: { cycles: 3, forks: 0 },
  },
  {
    id: "2",
    slug: "sleep-pm",
    name: "Sleep PM",
    description: "Night routine",
    goal: "SLEEP",
    durationWeeks: 6,
    evidenceScore: 72,
    isPublic: true,
    category: "RECOVERY",
    folder: "Evening",
    tags: ["sleep"],
    riskFlags: ["daytime sedation risk"],
    orderIndex: 1,
    upvotes: 4,
    forkCount: 0,
    forkedFromId: null,
    createdAt: "2026-02-05T00:00:00.000Z",
    creator: { name: "A", image: null },
    compounds: [],
    _count: { cycles: 0, forks: 0 },
  },
];

test("applyStackFilters filters by folder/tag/risk and custom ordering", () => {
  const result = applyStackFilters(baseStacks, {
    search: "",
    goal: "ALL",
    category: "COGNITION",
    folder: "Morning",
    tag: "focus",
    risk: "sleep disruption risk",
    sortBy: "custom",
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].slug, "focus-am");

  const custom = applyStackFilters(baseStacks, {
    search: "",
    goal: "ALL",
    category: "ALL",
    folder: "ALL",
    tag: "ALL",
    risk: "ALL",
    sortBy: "custom",
  });
  assert.deepEqual(custom.map((s) => s.id), ["2", "1"]);
});

test("count helpers aggregate category/folder/tag/risk", () => {
  assert.equal(getCategoryCounts(baseStacks).length, 2);
  assert.equal(getFolderCounts(baseStacks).length, 2);
  assert.deepEqual(getTagCounts(baseStacks).find((t) => t.tag === "focus")?.count, 1);
  assert.deepEqual(getRiskCounts(baseStacks).find((r) => r.risk === "daytime sedation risk")?.count, 1);
});

test("sort supports cycles", () => {
  const result = applyStackFilters(baseStacks, {
    search: "",
    goal: "ALL",
    category: "ALL",
    folder: "ALL",
    tag: "ALL",
    risk: "ALL",
    sortBy: "cycles",
  });

  assert.equal(result[0].id, "1");
});
