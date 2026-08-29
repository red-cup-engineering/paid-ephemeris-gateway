/**
 * `policy.test` — tier 5's pedagogy: real minimum-description-length compression, including the
 * honest "this is a BAD compression" case DESIGN.md §4 explicitly asks for ("a player can build a
 * policy that's longer than what it replays... and the game says so, plainly").
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { descriptionLength, findMinimalBlockLength, isRealCompression, policyCost, POLICY_OVERHEAD } from "./policy.mts";
import type { PolicyStepLike } from "./policy.mts";

const CLICK: PolicyStepLike = { kind: "click", payload: {} };
const TICK = (n: number): PolicyStepLike => ({ kind: "tick", payload: { toTs: n } });

test("findMinimalBlockLength finds the true repeating unit, not just 'the whole sequence'", () => {
  const repeating = [CLICK, CLICK, CLICK, CLICK]; // block length 1, repeated 4x
  assert.equal(findMinimalBlockLength(repeating), 1);
});

test("findMinimalBlockLength falls back to the full length when there is genuinely no smaller repeating block", () => {
  const noRepeat = [TICK(1), TICK(2), TICK(3)]; // three distinct steps, no repeating structure
  assert.equal(findMinimalBlockLength(noRepeat), 3);
});

test("pedagogy (tier 5, compression-as-understanding): a genuinely repeating policy compresses — description length is strictly shorter than the raw step count", () => {
  const steps = Array.from({ length: 12 }, () => CLICK); // 12 identical steps: minimal block=1, repeats=12
  const dl = descriptionLength(steps);
  assert.ok(dl < steps.length, `description length ${dl} should be strictly less than raw length ${steps.length} for a maximally repetitive policy`);
  assert.equal(isRealCompression(steps), true);
});

test("pedagogy (tier 5): a policy with NO repeating structure is honestly reported as NOT a real compression — the game does not flatter every macro equally", () => {
  const steps = [TICK(1), TICK(2), TICK(3)];
  const dl = descriptionLength(steps);
  assert.equal(dl, POLICY_OVERHEAD + steps.length, "no smaller block exists, so description length is exactly overhead + raw length — strictly LONGER than the raw steps");
  assert.equal(isRealCompression(steps), false, "a policy that is its own minimal description must not be reported as a real compression");
});

test("policyCost.savedAttention is negative for a bad (non-repeating, single-use) policy — an honest signed number, not clamped to zero", () => {
  const steps = [TICK(1), TICK(2)];
  const cost = policyCost(steps);
  assert.ok(cost.savedAttention < 0, `savedAttention should be negative for a policy with real overhead and no repetition, got ${cost.savedAttention}`);
  assert.equal(cost.isRealCompression, false);
});

test("policyCost.savedAttention is positive for a real compression", () => {
  const steps = Array.from({ length: 20 }, () => CLICK);
  const cost = policyCost(steps);
  assert.ok(cost.savedAttention > 0);
  assert.equal(cost.rawCost, 20);
});

test("descriptionLength of an empty policy is exactly POLICY_OVERHEAD", () => {
  assert.equal(descriptionLength([]), POLICY_OVERHEAD);
});

test("descriptionLength never returns something absurd: a partially-repeating-but-imperfect sequence falls back honestly to its own full length", () => {
  const almostRepeating = [CLICK, CLICK, CLICK, TICK(9)]; // not a clean divisor-based repeat
  const dl = descriptionLength(almostRepeating);
  assert.equal(dl, POLICY_OVERHEAD + almostRepeating.length);
});
