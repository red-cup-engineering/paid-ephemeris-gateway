import { test } from "node:test";
import assert from "node:assert/strict";
import { MARGIN_LINE_MAX_LENGTH, MarginLineError, deriveChildSeed, lineageSize, spawnChild, writeMargin } from "./mentorship.mts";
import { starterState } from "./state.mts";
import type { ReflectionRecord } from "./state.mts";

const HISTORY: readonly ReflectionRecord[] = [
  { lambda: 1.23456, mixture: { a: 0.5, b: 0.5 }, resetAtTs: 100, taintedBy: null, insightBanked: 5 },
];

test("deriveChildSeed is a pure function of (parentSeed, reflectionHistory) — identical inputs always derive the identical seed", () => {
  const a = deriveChildSeed("parent", HISTORY);
  const b = deriveChildSeed("parent", HISTORY);
  assert.equal(a, b);
});

test("deriveChildSeed changes when the parent seed changes, or when the reflection history changes", () => {
  const base = deriveChildSeed("parent", HISTORY);
  assert.notEqual(deriveChildSeed("a-different-parent", HISTORY), base);
  const differentHistory: readonly ReflectionRecord[] = [{ ...HISTORY[0]!, taintedBy: "widgetsdisplayed-metric-shortcut" }];
  assert.notEqual(deriveChildSeed("parent", differentHistory), base);
});

test("spawnChild returns a real, distinct seed and appends it to childSeeds", () => {
  const result = spawnChild("parent", HISTORY, []);
  assert.equal(result.childSeed, deriveChildSeed("parent", HISTORY));
  assert.deepEqual(result.childSeeds, [result.childSeed]);
});

test("spawnChild refuses a duplicate spawn from the identical (seed, reflectionHistory) pair — a real, honest refusal, not a silent duplicate", () => {
  const first = spawnChild("parent", HISTORY, []);
  assert.throws(() => spawnChild("parent", HISTORY, first.childSeeds), RangeError);
});

test("a spawned child seed derives a genuinely different, valid starting state than the parent's own seed", () => {
  const parent = starterState(0, "parent-seed");
  const result = spawnChild(parent.seed, parent.reflectionHistory, parent.cognition.childSeeds);
  const child = starterState(0, result.childSeed);
  assert.notEqual(child.seed, parent.seed);
  assert.deepEqual(child.widgets, parent.widgets, "a fresh child starts from the same honest starter graph as any fresh run");
});

test("writeMargin appends a trimmed line and refuses a blank one", () => {
  const withNote = writeMargin([], "  a real note  ");
  assert.deepEqual(withNote, ["a real note"]);
  assert.throws(() => writeMargin([], "   "), MarginLineError);
});

test("writeMargin refuses a line over the length cap rather than silently truncating it", () => {
  const tooLong = "x".repeat(MARGIN_LINE_MAX_LENGTH + 1);
  assert.throws(() => writeMargin([], tooLong), MarginLineError);
  const exact = "x".repeat(MARGIN_LINE_MAX_LENGTH);
  assert.deepEqual(writeMargin([], exact), [exact]);
});

test("lineageSize reads childSeeds.length directly", () => {
  const state = starterState(0, "seed-x");
  assert.equal(lineageSize(state), 0);
  const withChild = { ...state, cognition: { ...state.cognition, childSeeds: ["a", "b"] } };
  assert.equal(lineageSize(withChild), 2);
});
